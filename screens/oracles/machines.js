import {assign, spawn, createMachine} from 'xstate'
import {choose, log, send, sendParent} from 'xstate/lib/actions'
import dayjs from 'dayjs'
import {
  fetchVotings,
  isVotingStatus,
  isVotingMiningStatus,
  eitherStatus,
  createContractReadonlyCaller,
  createContractDataReader,
  setVotingStatus,
  votingFinishDate,
  votingStatuses,
  fetchContractBalanceUpdates,
  stripOptions,
  hasValuableOptions,
  fetchVoting,
  mapVoting,
  fetchLastOpenVotings,
  hasLinklessOptions,
  estimateTerminateContract,
  terminateContract,
  callContract,
  estimateCallContract,
  estimateDeployContract,
  deployContract,
  normalizeId,
  minOwnerDeposit,
} from './utils'
import {VotingStatus} from '../../shared/types'
import {
  callRpc,
  HASH_IN_MEMPOOL,
  openExternalUrl,
} from '../../shared/utils/utils'
import db from '../../shared/utils/db'

import {VotingListFilter} from './types'
import {loadPersistentStateValue, persistItem} from '../../shared/utils/persist'
import {dnaSign, privateKeyToAddress} from '../../shared/utils/crypto'
import {sendDna} from '../../shared/api/utils'
import {toHexString} from '../../shared/utils/buffers'
import {AdVotingOption, AdVotingOptionId} from '../ads/types'
import {fetchNetworkSize} from '../../shared/api/dna'
import {isAddress} from '../wallets/utils'

export const votingListMachine = createMachine(
  {
    context: {
      votings: [],
      filter: VotingListFilter.Todo,
      statuses: [],
      showAll: false,
    },
    on: {
      REFRESH: 'loading',
      ERROR: {
        actions: ['onError'],
      },
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          START: {
            target: 'preload',
            actions: [
              assign({
                address: (_, {coinbase}) => coinbase,
                epoch: (_, {epoch}) => epoch,
              }),
            ],
          },
        },
      },
      preload: {
        invoke: {
          src: 'preload',
        },
        on: {
          DONE: {
            actions: ['applyPreloadData', log()],
            target: 'loading',
          },
        },
      },
      loading: {
        invoke: {
          src: 'loadVotings',
          onDone: {
            target: 'loaded',
            actions: ['applyVotings', log()],
          },
          onError: {
            target: 'failure',
            actions: ['setError', log()],
          },
        },
        initial: 'normal',
        states: {
          normal: {
            after: {
              1000: 'late',
            },
          },
          late: {},
        },
      },
      loaded: {
        on: {
          FILTER: {
            target: 'loading',
            actions: [
              'setFilter',
              'persistFilter',
              choose([
                {
                  actions: ['onResetLastVotingTimestamp'],
                  cond: ({prevFilter}, {value}) =>
                    prevFilter === VotingListFilter.Todo &&
                    value !== VotingListFilter.Todo,
                },
              ]),
            ],
          },
          TOGGLE_SHOW_ALL: {
            target: 'loading',
            actions: ['toggleShowAll', 'persistFilter'],
          },
          REVIEW_START_VOTING: {
            actions: [
              assign({
                startingVotingRef: ({votings}, {id}) =>
                  votings.find(({id: currId}) => currId === id)?.ref,
              }),
              log(),
            ],
          },
        },
        initial: 'idle',
        states: {
          idle: {
            on: {
              LOAD_MORE: 'loadingMore',
              TOGGLE_STATUS: {
                target: 'filtering',
                actions: ['applyStatuses', 'persistFilter', log()],
              },
            },
          },
          loadingMore: {
            invoke: {
              src: 'loadVotings',
              onDone: {
                target: 'idle',
                actions: ['applyMoreVotings', log()],
              },
              onError: {
                target: 'idle',
                actions: ['setError', log()],
              },
            },
          },
          filtering: {
            invoke: {
              src: 'loadVotings',
              onDone: {
                target: 'idle',
                actions: ['applyVotings', log()],
              },
              onError: {
                target: 'idle',
                actions: ['setError', log()],
              },
            },
          },
        },
      },
      failure: {
        on: {
          FILTER: {target: 'loading', actions: ['setFilter', 'persistFilter']},
          TOGGLE_STATUS: {
            target: 'loading',
            actions: ['applyStatuses', 'persistFilter', log()],
          },
        },
      },
    },
  },
  {
    actions: {
      applyVotings: assign({
        votings: ({epoch, address}, {data: {votings}}) =>
          votings.map(voting => ({
            ...voting,
            ref: spawn(
              // eslint-disable-next-line no-use-before-define
              votingMachine.withContext({...voting, epoch, address})
            ),
          })),
        continuationToken: (_, {data: {continuationToken}}) =>
          continuationToken,
      }),
      applyMoreVotings: assign({
        votings: ({votings, epoch, address}, {data: {votings: nextVotings}}) =>
          votings.concat(
            nextVotings.map(voting => ({
              ...voting,
              ref: spawn(
                // eslint-disable-next-line no-use-before-define
                votingMachine.withContext({
                  ...voting,
                  epoch,
                  address,
                })
              ),
            }))
          ),
        continuationToken: (_, {data: {continuationToken}}) =>
          continuationToken,
      }),
      applyPreloadData: assign((context, {data}) => ({
        ...context,
        ...data,
      })),
      setFilter: assign({
        prevFilter: ({filter}) => filter,
        filter: (_, {value}) => value,
        statuses: [],
        continuationToken: null,
      }),
      applyStatuses: assign({
        statuses: ({statuses}, {value}) =>
          statuses.includes(value)
            ? statuses.filter(s => s !== value)
            : statuses.concat(value),
        continuationToken: null,
      }),
      toggleShowAll: assign({
        showAll: (_, {value}) => value !== 'owned',
      }),
      persistFilter: ({filter, statuses, showAll}) => {
        persistItem('votings', 'filter', {filter, statuses, showAll})
      },
      setError: assign({
        errorMessage: (_, {data}) => data?.message,
      }),
    },
    services: {
      loadVotings: async ({
        epoch,
        address,
        filter,
        statuses,
        continuationToken,
      }) => {
        const {
          result,
          continuationToken: nextContinuationToken,
        } = await fetchVotings({
          all: [VotingListFilter.All, VotingListFilter.Own].some(
            s => s === filter
          ),
          own: filter === VotingListFilter.Own,
          oracle: address,
          'states[]': (statuses.length
            ? statuses
            : votingStatuses(filter)
          ).join(','),
          continuationToken,
        })

        const apiVotings = (result ?? []).map(mapVoting)

        const persistedVotings = (
          await db
            .table('votings')
            .bulkGet(apiVotings.map(x => normalizeId(x.id)))
        ).filter(x => x)

        const mergedVotings = apiVotings.map(apiVoting => ({
          epoch,
          ...persistedVotings.find(
            x => normalizeId(x.id) === normalizeId(apiVoting.id)
          ),
          ...apiVoting,
          id: normalizeId(apiVoting.id),
        }))

        await db.table('votings').bulkPut(mergedVotings)

        const prevLastVotingTimestamp =
          loadPersistentStateValue('votings', 'lastVotingTimestamp') ||
          new Date(0)

        if (filter === VotingListFilter.Todo) {
          const [{createTime}] = (await fetchLastOpenVotings({
            oracle: address,
            limit: 1,
          })) ?? [{createTime: new Date(0)}]
          persistItem('votings', 'lastVotingTimestamp', createTime)
        }

        return {
          votings: mergedVotings.map(voting => ({
            ...voting,
            isNew:
              filter === VotingListFilter.Todo &&
              new Date(voting.createDate) > new Date(prevLastVotingTimestamp),
          })),
          continuationToken: nextContinuationToken,
        }
      },
      preload: () => cb => {
        cb({
          type: 'DONE',
          data: loadPersistentStateValue('votings', 'filter'),
        })
      },
    },
  }
)

export const votingMachine = createMachine(
  {
    id: 'voting',
    initial: 'unknown',
    states: {
      unknown: {
        always: [
          {target: 'idle.resolveStatus', cond: 'isIdle'},
          {target: 'mining.resolveStatus', cond: 'isMining'},
          {
            target: VotingStatus.Invalid,
            cond: ({status}) => status === VotingStatus.Invalid,
          },
        ],
      },
      idle: {
        initial: 'resolveStatus',
        states: {
          resolveStatus: {
            always: [
              {
                target: VotingStatus.Pending,
                cond: 'isPending',
              },
              {
                target: VotingStatus.Open,
                cond: 'isRunning',
              },
              {
                target: VotingStatus.Voted,
                cond: 'isVoted',
              },
              {
                target: VotingStatus.Counting,
                cond: 'isCounting',
              },
              {
                target: VotingStatus.CanBeProlonged,
                cond: 'isCanBeProlonged',
              },
              {
                target: VotingStatus.Archived,
                cond: 'isArchived',
              },
              {
                target: `#voting.${VotingStatus.Invalid}`,
                actions: ['setInvalid', 'persist'],
              },
            ],
          },
          [VotingStatus.Pending]: {
            initial: 'idle',
            states: {
              idle: {
                on: {
                  REVIEW_START_VOTING: 'review',
                },
              },
              review: {
                invoke: {
                  src: 'loadOwnerDeposit',
                  onDone: {
                    actions: [
                      'applyOwnerDeposit',
                      sendParent(({id}) => ({type: 'REVIEW_START_VOTING', id})),
                    ],
                  },
                },
                on: {
                  START_VOTING: {
                    target: `#voting.mining.${VotingStatus.Starting}`,
                    actions: ['setStarting', 'persist'],
                  },
                  ERROR: {
                    actions: ['onError'],
                  },
                },
              },
            },
            on: {
              CANCEL: '.idle',
            },
          },
          [VotingStatus.Open]: {},
          [VotingStatus.Voted]: {},
          [VotingStatus.Counting]: {},
          [VotingStatus.CanBeProlonged]: {},
          [VotingStatus.Archived]: {},
          [VotingStatus.Terminated]: {},
          hist: {
            type: 'history',
          },
        },
        on: {
          ADD_FUND: {
            target: 'mining.funding',
            actions: ['setFunding', 'persist', log()],
          },
        },
      },
      mining: votingMiningStates('voting'),
      [VotingStatus.Invalid]: {
        on: {
          ADD_FUND: {
            target: 'mining.funding',
            actions: ['setFunding', 'persist', log()],
          },
        },
      },
    },
  },
  {
    actions: {
      setPending: setVotingStatus(VotingStatus.Pending),
      setFunding: assign({
        prevStatus: ({status}) => status,
        status: VotingStatus.Funding,
        balance: ({balance = 0}, {amount}) => balance + amount,
      }),
      setStarting: setVotingStatus(VotingStatus.Starting),
      setRunning: setVotingStatus(VotingStatus.Open),
      setInvalid: assign({
        status: VotingStatus.Invalid,
        errorMessage: (_, {error}) => error?.message,
      }),
      restorePrevStatus: assign({
        status: ({status, prevStatus}) => prevStatus || status,
      }),
      applyTx: assign({
        txHash: (_, {data}) => data,
      }),
      handleError: assign({
        errorMessage: (_, {error}) => error,
      }),
      onError: sendParent((_, {data}) => ({type: 'ERROR', data})),
      clearMiningStatus: assign({
        miningStatus: null,
      }),
      // eslint-disable-next-line no-shadow
      persist: context =>
        db.table('votings').put({
          id: normalizeId(context.id || context.contractAddress),
          ...context,
        }),
      applyOwnerDeposit: assign({
        ownerDeposit: (_, {data}) => data,
      }),
    },
    services: {
      ...votingServices(),
      loadOwnerDeposit,
      pollStatus: ({txHash}) => cb => {
        let timeoutId

        const fetchStatus = async () => {
          try {
            const result = await callRpc('bcn_transaction', txHash)
            if (result.blockHash !== HASH_IN_MEMPOOL) {
              cb('MINED')
            } else {
              timeoutId = setTimeout(fetchStatus, 10 * 1000)
            }
          } catch (error) {
            cb('TX_NULL', {error})
          }
        }

        timeoutId = setTimeout(fetchStatus, 10 * 1000)

        return () => {
          clearTimeout(timeoutId)
        }
      },
    },
    guards: {
      ...votingStatusGuards(),
    },
  }
)

export const newVotingMachine = createMachine(
  {
    context: {
      options: [{id: 0}, {id: 1}],
      votingDuration: 4320,
      publicVotingDuration: 2160,
      quorum: 1,
      committeeSize: 100,
      shouldStartImmediately: true,
      dirtyBag: {},
      rewardsFund: 0,
    },
    initial: 'waiting',
    states: {
      waiting: {
        on: {
          START: {
            target: 'preload',
            actions: [
              assign({
                address: (_, {coinbase}) => coinbase,
                epoch: (_, {epoch}) => epoch,
              }),
            ],
          },
        },
      },
      preload: {
        invoke: {
          src: () =>
            Promise.all([callRpc('bcn_feePerGas'), fetchNetworkSize()]),
          onDone: {
            target: 'choosingPreset',
            actions: [
              assign((context, {data: [feePerGas, networkSize]}) => ({
                ...context,
                feePerGas,
                networkSize,
                ownerDeposit: minOwnerDeposit(
                  networkSize,
                  context.committeeSize
                ),
              })),
              log(),
            ],
          },
        },
        initial: 'normal',
        states: {
          normal: {
            after: {
              1000: 'late',
            },
          },
          late: {},
        },
      },
      choosingPreset: {
        on: {
          CHOOSE_PRESET: {
            target: 'editing',
            actions: [
              choose([
                {
                  actions: [
                    assign({
                      shouldStartImmediately: false,
                      winnerThreshold: String(51),
                      startDate: dayjs()
                        .add(1, 'w')
                        .toString(),
                      quorum: 5,
                    }),
                  ],
                  cond: (_, {preset}) => preset === 'fact',
                },
                {
                  actions: [
                    assign({
                      shouldStartImmediately: true,
                      winnerThreshold: String(100),
                      quorum: 1,
                      votingMinPayment: 0,
                      isFreeVoting: true,
                    }),
                  ],
                  cond: (_, {preset}) => preset === 'poll',
                },
                {
                  actions: [
                    assign({
                      shouldStartImmediately: false,
                      winnerThreshold: String(51),
                      quorum: 5,
                      votingMinPayment: 0,
                      isFreeVoting: true,
                    }),
                  ],
                  cond: (_, {preset}) => preset === 'decision',
                },
              ]),
              log(),
            ],
          },
          CANCEL: 'editing',
        },
      },
      editing: {
        on: {
          CHANGE: {
            actions: ['setContractParams', 'setDirty', log()],
          },
          CHANGE_COMMITTEE: {
            target: '.updateOwnerDeposit',
            actions: ['setContractParams', 'setDirty', log()],
          },
          SET_DIRTY: {
            actions: 'setDirty',
          },
          SET_OPTIONS: {
            actions: [
              'setOptions',
              send({type: 'SET_DIRTY', id: 'options'}),
              log(),
            ],
          },
          ADD_OPTION: {
            actions: ['addOption'],
          },
          REMOVE_OPTION: {
            actions: ['removeOption'],
          },
          SET_WHOLE_NETWORK: [
            {
              target: '.updateOwnerDeposit',
              actions: [assign({isWholeNetwork: true})],
              cond: (_, {checked}) => checked,
            },
            {
              actions: [assign({isWholeNetwork: false})],
            },
          ],
          PUBLISH: [
            {
              target: 'publishing',
              actions: [log()],
              cond: 'isValidForm',
            },
            {
              actions: [
                'onInvalidForm',
                send(
                  ({
                    options,
                    startDate,
                    shouldStartImmediately,
                    isCustomOwnerAddress,
                    ownerAddress,
                    ...context
                  }) => ({
                    type: 'SET_DIRTY',
                    ids: [
                      hasValuableOptions(options) && hasLinklessOptions(options)
                        ? null
                        : 'options',
                      shouldStartImmediately || startDate ? null : 'startDate',
                      isCustomOwnerAddress && !isAddress(ownerAddress)
                        ? 'ownerAddress'
                        : null,
                      ...['title', 'desc'].filter(f => !context[f]),
                    ].filter(v => v),
                  })
                ),
                log(),
              ],
            },
          ],
        },
        initial: 'idle',
        states: {
          idle: {},
          updateOwnerDeposit: {
            invoke: {
              src: () => fetchNetworkSize(),
              onDone: {
                target: 'idle',
                actions: [
                  assign((context, {data}) => {
                    const committeeSize = context.isWholeNetwork
                      ? data
                      : context.committeeSize
                    return {
                      ...context,
                      committeeSize,
                      networkSize: data,
                      ownerDeposit: minOwnerDeposit(data, committeeSize),
                    }
                  }),
                ],
              },
            },
          },
        },
      },
      publishing: {
        initial: 'review',
        states: {
          review: {
            on: {
              ERROR: {actions: ['onError']},
              CANCEL: {actions: send('EDIT')},
              CONFIRM: 'deploy',
            },
          },
          deploy: {
            initial: 'deploying',
            states: {
              deploying: {
                initial: 'submitting',
                states: {
                  submitting: {
                    invoke: {
                      src: 'deployContract',
                      onDone: {
                        target: 'mining',
                        actions: ['applyDeployResult', log()],
                      },
                      onError: {
                        actions: ['onError', send('PUBLISH_FAILED'), log()],
                      },
                    },
                  },
                  mining: {
                    invoke: {
                      src: 'pollStatus',
                    },
                    on: {
                      MINED: [
                        {
                          actions: [
                            send((_, {privateKey, balance}) => ({
                              type: 'START_VOTING',
                              privateKey,
                              balance,
                            })),
                          ],
                          cond: 'shouldStartImmediately',
                        },
                        {
                          target: 'persist',
                          actions: ['setPending', log()],
                        },
                      ],
                    },
                  },
                  persist: {
                    invoke: {
                      src: 'persist',
                      onDone: {
                        actions: [send('DONE')],
                      },
                      onError: {
                        actions: ['onError', send('EDIT'), log()],
                      },
                    },
                  },
                },
              },
            },
            on: {
              START_VOTING: VotingStatus.Starting,
            },
          },
          [VotingStatus.Starting]: {
            initial: 'submitting',
            states: {
              submitting: {
                invoke: {
                  src: (context, {privateKey, balance}) =>
                    votingServices().startVoting(context, {
                      privateKey,
                      balance,
                    }),
                  onDone: {
                    target: 'mining',
                    actions: [
                      assign({
                        txHash: (_, {data}) => data,
                      }),
                      log(),
                    ],
                  },
                  onError: {
                    actions: ['onError', send('PUBLISH_FAILED'), log()],
                  },
                },
              },
              mining: {
                invoke: {
                  src: 'pollStatus',
                },
                on: {
                  MINED: {
                    target: 'persist',
                    actions: ['setRunning', log()],
                  },
                },
              },
              persist: {
                invoke: {
                  src: 'persist',
                  onDone: {
                    actions: [send('DONE')],
                  },
                  onError: {
                    actions: ['onError', send('EDIT'), log()],
                  },
                },
              },
            },
          },
        },
        on: {
          DONE: 'done',
          EDIT: 'editing',
          PUBLISH_FAILED: 'editing',
        },
      },
      done: {
        entry: ['onDone', 'persist'],
      },
    },
  },
  {
    actions: {
      applyDeployResult: assign((context, {data: {txHash, voting}}) => ({
        ...context,
        txHash,
        ...voting,
      })),
      applyTx: assign({
        txHash: (_, {data: {txHash}}) => txHash,
      }),
      setContractParams: assign((context, {id, value}) => ({
        ...context,
        [id]: value,
      })),
      setOptions: assign({
        options: ({options}, {id, value}) => {
          const idx = options.findIndex(o => o.id === id)
          return [
            ...options.slice(0, idx),
            {...options[idx], value},
            ...options.slice(idx + 1),
          ]
        },
      }),
      addOption: assign({
        options: ({options}) =>
          options.concat({
            id: Math.max(...options.map(({id}) => id)) + 1,
          }),
      }),
      removeOption: assign({
        options: ({options}, {id}) => options.filter(o => o.id !== id),
      }),
      setDirty: assign({
        dirtyBag: ({dirtyBag}, {id, ids = []}) => ({
          ...dirtyBag,
          [id]: true,
          ...ids.reduce(
            (acc, curr) => ({
              ...acc,
              [curr]: true,
            }),
            {}
          ),
        }),
      }),
      setPending: setVotingStatus(VotingStatus.Pending),
      setRunning: setVotingStatus(VotingStatus.Open),
      // eslint-disable-next-line no-shadow
      persist: context =>
        db.table('votings').put({
          id: normalizeId(context.id || context.contractAddress),
          ...context,
        }),
    },
    services: {
      deployContract: async (
        // eslint-disable-next-line no-shadow
        {epoch, address, ...voting},
        {privateKey, balance, stake}
      ) => {
        const {
          receipt: {contract, gasCost, txFee},
        } = await estimateDeployContract(privateKey, {
          stake,
          ...voting,
        })

        const txHash = await deployContract(privateKey, {
          gasCost,
          txFee,
          stake,
          ...voting,
        })

        const nextVoting = {
          ...voting,
          id: normalizeId(contract),
          options: stripOptions(voting.options),
          contractHash: contract,
          issuer: address,
          createDate: Date.now(),
          startDate: voting.shouldStartImmediately
            ? Date.now()
            : voting.startDate,
          finishDate: votingFinishDate(voting),
        }

        await db.table('votings').put({
          epoch,
          ...nextVoting,
          txHash,
          status: VotingStatus.Deploying,
        })

        return {txHash, privateKey, voting: nextVoting, balance}
      },
      pollStatus: ({txHash}, {data: {privateKey, balance}}) => cb => {
        let timeoutId

        const fetchStatus = async () => {
          try {
            const result = await callRpc('bcn_transaction', txHash)
            if (result.blockHash !== HASH_IN_MEMPOOL) {
              cb({type: 'MINED', privateKey, balance})
            } else {
              timeoutId = setTimeout(fetchStatus, 10 * 1000)
            }
          } catch (error) {
            cb('TX_NULL', {error: error?.message})
          }
        }

        timeoutId = setTimeout(fetchStatus, 10 * 1000)

        return () => {
          clearTimeout(timeoutId)
        }
      },
      persist: context =>
        db.table('votings').put({
          id: normalizeId(context.id || context.contractAddress),
          ...context,
        }),
    },
    guards: {
      shouldStartImmediately: ({
        shouldStartImmediately,
        isCustomOwnerAddress,
      }) => shouldStartImmediately && !isCustomOwnerAddress,
      isValidForm: ({
        title,
        desc,
        options,
        startDate,
        shouldStartImmediately,
        committeeSize,
        isCustomOwnerAddress,
        ownerAddress,
      }) =>
        title &&
        desc &&
        hasValuableOptions(options) &&
        hasLinklessOptions(options) &&
        (startDate || shouldStartImmediately) &&
        Number(committeeSize) > 0 &&
        (!isCustomOwnerAddress ||
          (isCustomOwnerAddress && isAddress(ownerAddress))),
    },
  }
)

export const viewVotingMachine = createMachine(
  {
    id: 'viewVoting',
    context: {
      balanceUpdates: [],
    },
    on: {
      RELOAD: {
        target: 'loading',
        actions: [
          assign((context, event) => ({
            ...context,
            ...event,
          })),
        ],
      },
    },
    initial: 'waiting',
    states: {
      waiting: {},
      loading: {
        invoke: {
          src: 'loadVoting',
          onDone: {
            target: 'loadOwnerDeposit',
            actions: ['applyVoting', log()],
          },
          onError: {
            target: 'invalid',
            actions: [log()],
          },
        },
      },
      loadOwnerDeposit: {
        invoke: {
          src: 'loadOwnerDeposit',
          onDone: {
            target: 'idle',
            actions: ['applyOwnerDeposit', log()],
          },
          onError: {
            target: 'invalid',
            actions: [log()],
          },
        },
      },
      idle: {
        initial: 'resolveStatus',
        states: {
          resolveStatus: {
            always: [
              {
                target: VotingStatus.Pending,
                cond: 'isPending',
              },
              {
                target: VotingStatus.Open,
                cond: 'isRunning',
              },
              {
                target: VotingStatus.Voted,
                cond: 'isVoted',
              },
              {
                target: VotingStatus.Counting,
                cond: 'isCounting',
              },
              {
                target: VotingStatus.CanBeProlonged,
                cond: 'isCanBeProlonged',
              },
              {
                target: VotingStatus.Archived,
                cond: 'isArchived',
              },
              {
                target: VotingStatus.Terminated,
                cond: 'isTerminated',
              },
              {
                target: `#viewVoting.${VotingStatus.Invalid}`,
                actions: ['setInvalid', 'persist'],
              },
            ],
          },
          [VotingStatus.Pending]: {
            initial: 'idle',
            states: {
              idle: {
                on: {
                  REVIEW_START_VOTING: 'review',
                },
              },
              review: {
                on: {
                  START_VOTING: {
                    target: `#viewVoting.mining.${VotingStatus.Starting}`,
                    actions: ['setStarting', 'persist'],
                  },
                  ERROR: {
                    actions: ['onError'],
                  },
                },
              },
            },
            on: {
              CANCEL: '.idle',
            },
          },
          [VotingStatus.Open]: {},
          [VotingStatus.Voted]: {},
          [VotingStatus.Counting]: {},
          [VotingStatus.CanBeProlonged]: {},
          [VotingStatus.Archived]: {},
          [VotingStatus.Terminated]: {},
          terminating: {
            on: {
              TERMINATE: {
                target: `#viewVoting.mining.${VotingStatus.Terminating}`,
                actions: ['setTerminating', 'persist'],
              },
              CANCEL: '#viewVoting.idle',
            },
          },
          redirecting: {
            entry: [
              assign({
                redirectUrl: (_, {url}) => url,
              }),
              log(),
            ],
            on: {
              CONTINUE: {
                target: '#viewVoting.idle',
                actions: [({redirectUrl}) => openExternalUrl(redirectUrl)],
              },
              CANCEL: '#viewVoting.idle',
            },
          },
          hist: {
            type: 'history',
          },
        },
        on: {
          ADD_FUND: 'funding',
          SELECT_OPTION: {
            actions: ['selectOption', log()],
          },
          FORCE_REJECT: {
            actions: [
              assign({
                selectedOption: AdVotingOptionId[AdVotingOption.Reject],
              }),
            ],
          },
          REVIEW: [
            {
              actions: [
                send({
                  type: 'ERROR',
                  data: {message: 'Please choose an option'},
                }),
              ],
              cond: ({selectedOption = -1}) => selectedOption < 0,
            },
            {
              target: 'review',
            },
          ],
          TERMINATE: '.terminating',
          REFRESH: 'loading',
          ERROR: {
            actions: ['onError'],
          },
          REVIEW_PROLONG_VOTING: 'prolong',
          REVIEW_FINISH_VOTING: 'finish',
          FOLLOW_LINK: '.redirecting',
        },
      },
      review: {
        on: {
          VOTE: {
            target: `mining.${VotingStatus.Voting}`,
            actions: ['setVoting', 'persist'],
          },
          CANCEL: 'idle',
        },
      },
      funding: {
        on: {
          ADD_FUND: {
            target: `mining.${VotingStatus.Funding}`,
            actions: ['setFunding', 'persist'],
          },
          CANCEL: 'idle',
        },
      },
      finish: {
        on: {
          FINISH: {
            target: `#viewVoting.mining.${VotingStatus.Finishing}`,
            actions: ['setFinishing', 'persist'],
          },
          CANCEL: 'idle',
        },
      },
      prolong: {
        on: {
          PROLONG_VOTING: {
            target: `#viewVoting.mining.${VotingStatus.Prolonging}`,
            actions: ['setProlonging', 'persist'],
          },
          CANCEL: 'idle',
        },
      },
      mining: votingMiningStates('viewVoting'),
      invalid: {},
    },
  },
  {
    actions: {
      applyVoting: assign((context, {data}) => ({
        ...context,
        ...data,
      })),
      setFunding: assign({
        prevStatus: ({status}) => status,
        status: VotingStatus.Funding,
        balance: ({balance = 0}, {amount}) => Number(balance) + Number(amount),
      }),
      setStarting: setVotingStatus(VotingStatus.Starting),
      setRunning: setVotingStatus(VotingStatus.Open),
      setVoting: setVotingStatus(VotingStatus.Voting),
      setProlonging: setVotingStatus(VotingStatus.Prolonging),
      setFinishing: setVotingStatus(VotingStatus.Finishing),
      setTerminating: setVotingStatus(VotingStatus.Terminating),
      setTerminated: setVotingStatus(VotingStatus.Terminated),
      setVoted: setVotingStatus(VotingStatus.Voted),
      setArchived: assign({
        status: VotingStatus.Archived,
      }),
      setInvalid: assign({
        status: VotingStatus.Invalid,
        errorMessage: (_, {error}) => error?.message,
      }),
      restorePrevStatus: assign({
        status: ({prevStatus}) => prevStatus,
      }),
      applyVote: assign({
        txHash: (_, {data: {voteHash}}) => voteHash,
        pendingVote: (_, {data: {vote}}) => vote,
      }),
      applyTx: assign({
        txHash: (_, {data}) => data,
      }),
      handleError: assign({
        errorMessage: (_, {error}) => error,
      }),
      clearMiningStatus: assign({
        miningStatus: null,
      }),
      selectOption: assign({
        selectedOption: (_, {option}) => option,
      }),
      // eslint-disable-next-line no-shadow
      persist: context =>
        db.table('votings').put({
          id: normalizeId(context.id || context.contractAddress),
          ...context,
        }),
      applyOwnerDeposit: assign({
        ownerDeposit: (_, {data}) => data,
      }),
    },
    services: {
      // eslint-disable-next-line no-shadow
      loadVoting: async ({address, id}) => ({
        ...(await db
          .table('votings')
          .get(id)
          .catch(() => null)),
        ...mapVoting(await fetchVoting({id, address})),
        id,
        balanceUpdates: await fetchContractBalanceUpdates({
          address,
          contractAddress: id,
        }),
      }),
      loadOwnerDeposit,
      ...votingServices(),
      vote: async (
        // eslint-disable-next-line no-shadow
        {contractHash, selectedOption, epoch},
        {privateKey}
      ) => {
        const readonlyCallContract = createContractReadonlyCaller({
          contractHash,
        })
        const readContractData = createContractDataReader(contractHash)

        const proof = await readonlyCallContract('proof', 'hex', [
          {
            value: privateKeyToAddress(privateKey),
          },
        ])

        const {error} = proof
        if (error) throw new Error(error)

        const salt = toHexString(
          dnaSign(`salt-${contractHash}-${epoch}`, privateKey),
          true
        )

        const voteHash = await readonlyCallContract('voteHash', 'hex', [
          {value: selectedOption, format: 'byte'},
          {value: salt},
        ])

        const votingMinPayment = Number(
          await readContractData('votingMinPayment', 'dna')
        )

        const voteProofData = {
          method: 'sendVoteProof',
          contractHash,
          amount: votingMinPayment,
          args: [
            {
              value: voteHash,
            },
          ],
        }

        const {
          receipt: {gasCost: callGasCost, txFee: callTxFee},
        } = await estimateCallContract(privateKey, voteProofData)

        const voteProofResponse = await callContract(privateKey, {
          ...voteProofData,
          gasCost: Number(callGasCost),
          txFee: Number(callTxFee),
        })

        const voteBlock = Number(
          await readonlyCallContract('voteBlock', 'uint64')
        )

        return {
          voteHash: voteProofResponse,
          vote: {
            block: voteBlock,
            contractHash,
            amount: votingMinPayment,
            args: [
              {value: selectedOption.toString(), format: 'byte'},
              {value: salt},
            ],
          },
        }
      },
      prolongVoting: async ({contractHash}, {privateKey}) => {
        const {
          receipt: {gasCost, txFee},
        } = await estimateCallContract(privateKey, {
          method: 'prolongVoting',
          contractHash,
        })

        return callContract(privateKey, {
          method: 'prolongVoting',
          contractHash,
          gasCost: Number(gasCost),
          txFee: Number(txFee),
        })
      },
      finishVoting: async ({contractHash}, {privateKey}) => {
        const {
          receipt: {gasCost, txFee},
        } = await estimateCallContract(privateKey, {
          method: 'finishVoting',
          contractHash,
        })

        return callContract(privateKey, {
          method: 'finishVoting',
          contractHash,
          gasCost: Number(gasCost),
          txFee: Number(txFee),
        })
      },
      terminateContract: async (
        {
          // eslint-disable-next-line no-shadow
          address,
          issuer = address,
          contractHash,
        },
        {privateKey}
      ) => {
        const terminateData = {
          contractHash,
          args: [{value: issuer}],
        }

        const {
          receipt: {gasCost, txFee},
        } = await estimateTerminateContract(privateKey, terminateData)

        return terminateContract(privateKey, {
          ...terminateData,
          gasCost,
          txFee,
        })
      },
      pollStatus: ({txHash}) => cb => {
        let timeoutId

        const fetchStatus = async () => {
          try {
            const result = await callRpc('bcn_transaction', txHash)
            if (result.blockHash !== HASH_IN_MEMPOOL) {
              cb('MINED')
            } else {
              timeoutId = setTimeout(fetchStatus, 10 * 1000)
            }
          } catch (error) {
            cb('TX_NULL', {error: error?.message})
          }
        }

        timeoutId = setTimeout(fetchStatus, 10 * 1000)

        return () => {
          clearTimeout(timeoutId)
        }
      },
    },
    guards: {
      // eslint-disable-next-line no-use-before-define
      ...votingStatusGuards(),
    },
  }
)

function votingMiningStates(machineId) {
  return {
    initial: 'resolveStatus',
    states: {
      resolveStatus: {
        always: [
          {
            target: VotingStatus.Deploying,
            cond: 'isDeploying',
          },
          {
            target: VotingStatus.Funding,
            cond: 'isFunding',
          },
          {
            target: VotingStatus.Starting,
            cond: 'isStarting',
          },
          {
            target: VotingStatus.Voting,
            cond: 'isVoting',
          },
          {
            target: VotingStatus.Finishing,
            cond: 'isFinishing',
          },
        ],
      },
      [VotingStatus.Deploying]: {
        invoke: {
          src: 'pollStatus',
        },
        on: {
          MINED: {
            target: `#${machineId}.idle.${VotingStatus.Pending}`,
            actions: ['setPending', 'clearMiningStatus', 'persist', log()],
          },
        },
      },
      [VotingStatus.Funding]: {
        initial: 'checkMiningStatus',
        states: {
          checkMiningStatus: {
            always: [
              {
                target: 'submitting',
                cond: 'shouldSubmit',
              },
              {
                target: 'mining',
                cond: 'shouldPollStatus',
              },
              {
                target: `#${machineId}.invalid`,
                actions: ['setInvalid', 'persist'],
              },
            ],
          },
          submitting: {
            invoke: {
              src: 'addFund',
              onDone: {
                target: 'mining',
                actions: ['applyTx', log()],
              },
              onError: {
                target: `#${machineId}.idle.hist`,
                actions: ['onError', 'restorePrevStatus', log()],
              },
            },
          },
          mining: {
            entry: [
              log(),
              assign({
                miningStatus: 'mining',
              }),
              'persist',
            ],
            invoke: {
              src: 'pollStatus',
            },
            on: {
              MINED: {
                target: `#${machineId}.idle.hist`,
                actions: [
                  'restorePrevStatus',
                  'clearMiningStatus',
                  'persist',
                  log(),
                ],
              },
            },
          },
        },
      },
      [VotingStatus.Starting]: {
        initial: 'checkMiningStatus',
        states: {
          checkMiningStatus: {
            always: [
              {
                target: 'submitting',
                cond: 'shouldSubmit',
              },
              {
                target: 'mining',
                cond: 'shouldPollStatus',
              },
              {
                target: `#${machineId}.invalid`,
                actions: ['setInvalid', 'persist'],
              },
            ],
          },
          submitting: {
            invoke: {
              src: 'startVoting',
              onDone: {
                target: 'mining',
                actions: ['applyTx', log()],
              },
              onError: {
                target: `#${machineId}.idle.hist`,
                actions: ['handleError', 'onError', 'restorePrevStatus', log()],
              },
            },
          },
          mining: {
            entry: [
              assign({
                miningStatus: 'mining',
              }),
              'persist',
            ],
            invoke: {
              src: 'pollStatus',
            },
            on: {
              MINED: {
                target: `#${machineId}.idle.${VotingStatus.Open}`,
                actions: ['setRunning', 'clearMiningStatus', 'persist', log()],
              },
            },
          },
        },
      },
      [VotingStatus.Voting]: {
        initial: 'checkMiningStatus',
        states: {
          checkMiningStatus: {
            always: [
              {
                target: 'submitting',
                cond: 'shouldSubmit',
              },
              {
                target: 'mining',
                cond: 'shouldPollStatus',
              },
              {
                target: `#${machineId}.invalid`,
                actions: ['setInvalid', 'persist'],
              },
            ],
          },
          submitting: {
            invoke: {
              src: 'vote',
              onDone: {
                target: 'mining',
                actions: ['applyVote', 'addVote', log()],
              },
              onError: {
                target: `#${machineId}.idle.hist`,
                actions: ['onError', 'restorePrevStatus', log()],
              },
            },
          },
          mining: {
            entry: [
              assign({
                miningStatus: 'mining',
              }),
              'persist',
            ],
            invoke: {
              src: 'pollStatus',
            },
            on: {
              MINED: {
                target: 'reviewPendingVote',
                actions: ['setVoted', 'clearMiningStatus', 'persist', log()],
              },
            },
          },
          reviewPendingVote: {
            on: {
              GOT_IT: {
                target: `#${machineId}.idle.${VotingStatus.Voted}`,
              },
            },
          },
        },
      },
      [VotingStatus.Prolonging]: {
        initial: 'checkMiningStatus',
        states: {
          checkMiningStatus: {
            always: [
              {
                target: 'submitting',
                cond: 'shouldSubmit',
              },
              {
                target: 'mining',
                cond: 'shouldPollStatus',
              },
              {
                target: `#${machineId}.invalid`,
                actions: ['setInvalid', 'persist'],
              },
            ],
          },
          submitting: {
            invoke: {
              src: 'prolongVoting',
              onDone: {
                target: 'mining',
                actions: ['applyTx', log()],
              },
              onError: {
                target: `#${machineId}.idle.hist`,
                actions: ['onError', 'restorePrevStatus', log()],
              },
            },
          },
          mining: {
            entry: [
              assign({
                miningStatus: 'mining',
              }),
              'persist',
            ],
            invoke: {
              src: 'pollStatus',
            },
            on: {
              MINED: {
                target: `#${machineId}.idle.${VotingStatus.Open}`,
                actions: ['setRunning', 'clearMiningStatus', 'persist', log()],
              },
            },
          },
        },
      },
      [VotingStatus.Finishing]: {
        initial: 'checkMiningStatus',
        states: {
          checkMiningStatus: {
            always: [
              {
                target: 'submitting',
                cond: 'shouldSubmit',
              },
              {
                target: 'mining',
                cond: 'shouldPollStatus',
              },
              {
                target: `#${machineId}.invalid`,
                actions: ['setInvalid', 'persist'],
              },
            ],
          },
          submitting: {
            invoke: {
              src: 'finishVoting',
              onDone: {
                target: 'mining',
                actions: ['applyTx', log()],
              },
              onError: {
                target: `#${machineId}.idle.hist`,
                actions: ['onError', 'restorePrevStatus', log()],
              },
            },
          },
          mining: {
            entry: [
              assign({
                miningStatus: 'mining',
              }),
              'persist',
            ],
            invoke: {
              src: 'pollStatus',
            },
            on: {
              MINED: {
                target: `#${machineId}.idle.${VotingStatus.Archived}`,
                actions: ['setArchived', 'clearMiningStatus', 'persist', log()],
              },
            },
          },
        },
      },
      [VotingStatus.Terminating]: {
        initial: 'checkMiningStatus',
        states: {
          checkMiningStatus: {
            always: [
              {
                target: 'submitting',
                cond: 'shouldSubmit',
              },
              {
                target: 'mining',
                cond: 'shouldPollStatus',
              },
              {
                target: `#${machineId}.invalid`,
                actions: ['setInvalid', 'persist'],
              },
            ],
          },
          submitting: {
            invoke: {
              src: 'terminateContract',
              onDone: {
                target: 'mining',
                actions: ['applyTx', log()],
              },
              onError: {
                target: `#${machineId}.idle.hist`,
                actions: ['onError', 'restorePrevStatus', log()],
              },
            },
          },
          mining: {
            entry: [
              assign({
                miningStatus: 'mining',
              }),
              'persist',
            ],
            invoke: {
              src: 'pollStatus',
            },
            on: {
              MINED: {
                target: `#${machineId}.idle.${VotingStatus.Terminated}`,
                actions: [
                  'setTerminated',
                  'clearMiningStatus',
                  'persist',
                  log(),
                ],
              },
            },
          },
        },
      },
    },
    on: {
      TX_NULL: {
        target: 'invalid',
        actions: ['setInvalid', 'clearMiningStatus', log()],
      },
    },
  }
}

function votingServices() {
  return {
    addFund: async ({contractHash}, {privateKey, amount}) =>
      sendDna(privateKey, contractHash, amount),
    startVoting: async (
      {contractHash},
      {privateKey, balance, amount = balance}
    ) => {
      const startVotingData = {
        method: 'startVoting',
        contractHash,
        amount,
      }

      const {
        receipt: {gasCost, txFee},
      } = await estimateCallContract(privateKey, startVotingData)

      return callContract(privateKey, {
        ...startVotingData,
        gasCost: Number(gasCost),
        txFee: Number(txFee),
      })
    },
  }
}

async function loadOwnerDeposit({committeeSize}) {
  const networkSize = await fetchNetworkSize()
  return minOwnerDeposit(networkSize, committeeSize)
}

function votingStatusGuards() {
  return {
    isIdle: eitherStatus(
      VotingStatus.Pending,
      VotingStatus.Open,
      VotingStatus.Voted,
      VotingStatus.Counting,
      VotingStatus.Archived
    ),
    isMining: ({status, txHash}) =>
      Boolean(txHash) &&
      eitherStatus(
        VotingStatus.Deploying,
        VotingStatus.Funding,
        VotingStatus.Starting,
        VotingStatus.Terminating
      )({status}),
    isDeploying: isVotingMiningStatus(VotingStatus.Deploying),
    isFunding: isVotingMiningStatus(VotingStatus.Funding),
    isStarting: isVotingMiningStatus(VotingStatus.Starting),
    isPending: isVotingStatus(VotingStatus.Pending),
    isRunning: isVotingStatus(VotingStatus.Open),
    isVoted: isVotingStatus(VotingStatus.Voted),
    isCounting: isVotingStatus(VotingStatus.Counting),
    isCanBeProlonged: isVotingStatus(VotingStatus.CanBeProlonged),
    isVoting: isVotingStatus(VotingStatus.Voting),
    isFinishing: isVotingStatus(VotingStatus.Finishing),
    isArchived: isVotingStatus(VotingStatus.Archived),
    isTerminated: isVotingStatus(VotingStatus.Terminated),
    shouldSubmit: ({miningStatus}) => !miningStatus,
    shouldPollStatus: ({miningStatus}) => miningStatus === 'mining',
  }
}
