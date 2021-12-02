import {useMachine} from '@xstate/react'
import {assign, createMachine, spawn} from 'xstate'
import {log} from 'xstate/lib/actions'
import {useAuthState} from '../../shared/providers/auth-context'
import {
  areSameCaseInsensitive,
  byId,
  callRpc,
  eitherState,
  HASH_IN_MEMPOOL,
} from '../../shared/utils/utils'
import {AdStatus} from './types'
import {buildAdReviewVoting, fetchTotalSpent} from './utils'

export function useAdList() {
  const adListMachine = createMachine({
    id: 'adList',
    context: {
      selectedAd: {},
      ads: [],
      filteredAds: [],
      filter: AdStatus.Active,
      totalSpent: 0,
    },
    initial: 'init',
    states: {
      init: {
        invoke: {
          src: 'init',
          onDone: {
            target: 'ready',
            actions: [
              assign({
                ads: (_, {data: {ads}}) => ads,
                // eslint-disable-next-line no-shadow
                filteredAds: ({status}, {data: {ads}}) =>
                  ads
                    .filter(ad => areSameCaseInsensitive(ad.status, status))
                    .map(ad => ({
                      ...ad,
                      // eslint-disable-next-line no-use-before-define
                      ref: spawn(adMachine.withContext(ad)),
                    })),
                // eslint-disable-next-line no-shadow
                totalSpent: (_, {data: {totalSpent}}) => totalSpent,
              }),
              log(),
            ],
          },
          onError: {target: 'fail', actions: [log()]},
        },
      },
      ready: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              FILTER: {
                actions: [
                  assign({
                    filter: (_, {value}) => value,
                    filteredAds: ({ads}, {value}) =>
                      // eslint-disable-next-line no-shadow
                      ads.filter(({status}) =>
                        areSameCaseInsensitive(status, value)
                      ),
                  }),
                  log(),
                ],
              },
              REVIEW: {
                target: 'sendingToReview',
                actions: [
                  assign({
                    selectedAd: ({ads}, ad) => ads.find(byId(ad)),
                  }),
                ],
              },
              REMOVE_AD: {
                target: 'removingAd',
                actions: [
                  assign({
                    ads: ({ads}, {id}) => ads.filter(ad => ad.id !== id),
                    // eslint-disable-next-line no-shadow
                    filteredAds: ({filteredAds}, {id}) =>
                      filteredAds.filter(ad => ad.id !== id),
                  }),
                ],
              },
            },
          },
          removingAd: {
            invoke: {
              src: 'removeAd',
              onDone: 'idle',
              onError: {actions: ['onError']},
            },
          },
          sendingToReview: {
            on: {
              CANCEL: 'idle',
            },
            initial: 'preview',
            states: {
              preview: {
                on: {
                  SUBMIT: 'submitting',
                },
              },
              submitting: {
                entry: [log()],
                invoke: {
                  src: 'sendToReview',
                  onDone: {
                    target: 'miningDeploy',
                    actions: [
                      assign({
                        txDeployHash: (_, {data}) => data.txHash,
                        contractHash: (_, {data}) => data.contractHash,
                      }),
                      log(),
                    ],
                  },
                  onError: {actions: ['onError']},
                },
              },
              miningDeploy: {
                invoke: {src: 'pollDeployVoting'},
                on: {
                  MINED: {
                    target: 'startingVoting',
                    actions: [log()],
                  },
                },
              },
              startingVoting: {
                invoke: {
                  src: 'startReviewVoting',
                  onDone: {
                    target: 'miningStartVoting',
                    actions: [
                      assign({
                        txStartHash: (_, {data}) => data,
                      }),
                      log(),
                    ],
                  },
                },
              },
              miningStartVoting: {
                invoke: {src: 'pollStartVoting'},
                on: {
                  MINED: {
                    target: '#adList.ready.idle',
                    actions: [
                      // eslint-disable-next-line no-shadow
                      assign(({ads, selectedAd, status}) => {
                        const applyReviewingStatus = ad => ({
                          ...ad,
                          status: AdStatus.Reviewing,
                        })

                        const nextAds = ads.map(ad =>
                          ad.id === selectedAd.id
                            ? {
                                ...applyReviewingStatus(ad),
                                ref: spawn(
                                  // eslint-disable-next-line no-use-before-define
                                  adMachine.withContext(
                                    applyReviewingStatus(ad)
                                  )
                                ),
                              }
                            : ad
                        )

                        return {
                          ads: nextAds,
                          filteredAds: nextAds.filter(
                            ad => ad.status === status
                          ),
                          selectedAd: applyReviewingStatus(selectedAd),
                        }
                      }),
                      'onSentToReview',
                      log(),
                    ],
                  },
                  TX_NULL: {actions: ['onError']},
                },
              },
            },
          },
        },
      },
      fail: {},
    },
    on: {
      SELECT: {
        actions: [
          assign({
            selectedAd: ({ads}, {id}) => ads.find(a => a.id === id),
          }),
        ],
      },
    },
  })

  const {coinbase} = useAuthState()

  const [current, send] = useMachine(adListMachine, {
    actions: {
      // eslint-disable-next-line no-unused-vars
      // onSentToReview: asEffect(({selectedAd: {ref, ...ad}}) => {
      //   db.put(ad)
      // }),
      // onError: (_, {data: {message}}) => {
      //   toastError(message)
      // },
    },
    services: {
      init: async () => ({
        ads: [],
        totalSpent: await fetchTotalSpent(coinbase),
      }),
      // eslint-disable-next-line no-shadow
      sendToReview: async ({selectedAd}, {from = coinbase, stake = 10000}) => {
        const voting = buildAdReviewVoting(selectedAd)

        // const {error, contract: contractHash, gasCost, txFee} = await callRpc(
        //   'contract_estimateDeploy',
        //   buildContractDeploymentArgs(
        //     voting,
        //     {from, stake},
        //     ContractRpcMode.Estimate
        //   )
        // )

        // if (error) throw new Error(error)

        // const txHash = await callRpc(
        //   'contract_deploy',
        //   buildContractDeploymentArgs(voting, {
        //     from,
        //     stake,
        //     gasCost,
        //     txFee,
        //   })
        // )

        // const nextVoting = {
        //   ...voting,
        //   contractHash,
        //   issuer: coinbase,
        //   createDate: Date.now(),
        //   startDate: Date.now(),
        //   finishDate: votingFinishDate(voting),
        // }

        // await createVotingDb(epoch?.epoch).put({
        //   ...nextVoting,
        //   id: contractHash,
        //   status: VotingStatus.Deploying,
        // })

        // await db.put({...selectedAd, contractHash})

        // return {txHash, contractHash}
      },
      pollDeployVoting: ({txDeployHash}) => cb => {
        let timeoutId

        const fetchStatus = async () => {
          try {
            const result = await callRpc('bcn_transaction', txDeployHash)
            if (result.blockHash !== HASH_IN_MEMPOOL) cb({type: 'MINED'})
            else timeoutId = setTimeout(fetchStatus, 10 * 1000)
          } catch (error) {
            cb('TX_NULL', {error: error?.message})
          }
        }

        timeoutId = setTimeout(fetchStatus, 10 * 1000)

        return () => {
          clearTimeout(timeoutId)
        }
      },
      startReviewVoting: async ({contractHash}, {amount = 100}) =>
        // let callContract = createContractCaller({
        //   contractHash,
        //   from: coinbase,
        //   amount,
        // })

        // const {error, gasCost, txFee} = await callContract(
        //   'startVoting',
        //   ContractRpcMode.Estimate
        // )

        // if (error) throw new Error(error)
        // callContract = createContractCaller({
        //   contractHash,
        //   from: address,
        //   amount,
        //   gasCost: Number(gasCost),
        //   txFee: Number(txFee),
        // })

        // return callContract('startVoting')
        Promise.resolve(),
      pollStartVoting: ({txStartHash}) => cb => {
        let timeoutId

        const fetchStatus = async () => {
          try {
            const result = await callRpc('bcn_transaction', txStartHash)
            if (result.blockHash !== HASH_IN_MEMPOOL) cb({type: 'MINED'})
            else timeoutId = setTimeout(fetchStatus, 10 * 1000)
          } catch (error) {
            cb('TX_NULL', {data: error})
          }
        }

        timeoutId = setTimeout(fetchStatus, 10 * 1000)

        return () => {
          clearTimeout(timeoutId)
        }
      },
    },
    removeAd: async (_, {id}) => {
      // await db.del(id)
    },
  })

  const {filteredAds, selectedAd, filter, totalSpent} = current.context

  const eitherCurrentState = (...states) => eitherState(current, ...states)

  return [
    {
      ads: filteredAds,
      selectedAd,
      filter,
      totalSpent,
      isReady: eitherCurrentState('ready'),
      isPublishing: eitherCurrentState('ready.publishing'),
      isSendingToReview: eitherCurrentState('ready.sendingToReview'),
      isMining: eitherCurrentState(
        'ready.sendingToReview.miningDeploy',
        'ready.sendingToReview.startingVoting',
        'ready.sendingToReview.miningStartVoting'
      ),
    },
    {
      filter(value) {
        send('FILTER', {value})
      },
      selectAd(id) {
        send('SELECT', {id})
      },
      removeAd(id) {
        send('REMOVE_AD', {id})
      },
      sendAdToReview(id) {
        send('REVIEW', {id})
      },
      submitAd() {
        send('SUBMIT')
      },
      cancel() {
        send('CANCEL')
      },
    },
  ]
}

export const adMachine = createMachine({
  id: 'ads',
  context: {
    title: '',
    cover: '',
    url: '',
    location: '',
    lang: '',
    age: 0,
    os: '',
  },
  initial: 'editing',
  states: {
    editing: {
      on: {
        CHANGE: {
          actions: [
            assign((ctx, {ad}) => ({
              ...ctx,
              ...ad,
            })),
          ],
        },
      },
    },
    publishing: {},
    idle: {},
  },
})

export const editAdMachine = createMachine({
  id: 'editAd',
  initial: 'init',
  states: {
    init: {
      invoke: {
        src: 'init',
        onDone: {
          target: 'editing',
          actions: [assign((ctx, {data}) => ({...ctx, ...data})), log()],
        },
        onFail: {
          actions: [log()],
        },
      },
    },
    editing: {
      on: {
        UPDATE: {
          actions: [assign((ctx, {ad}) => ({...ctx, ...ad})), log()],
        },
        SUBMIT: 'submitting',
        CLOSE: 'closing',
      },
    },
    submitting: {
      invoke: {
        src: 'submit',
        onDone: 'success',
        onError: 'failure',
      },
    },
    failure: {
      entry: [log()],
      on: {
        RETRY: 'submitting',
      },
    },
    success: {
      entry: ['onSuccess', log()],
      type: 'final',
    },
    closing: {
      invoke: {
        src: 'saveBeforeClose',
        onDone: {actions: ['onSaveBeforeClose']},
      },
    },
  },
})

export const adFormMachine = createMachine({
  id: 'adForm',
  context: {
    title: '',
    cover: '',
    url: '',
    location: '',
    lang: '',
    age: 0,
    os: '',
    stake: 0,
  },
  initial: 'editing',
  states: {
    editing: {
      on: {
        CHANGE: {
          target: '.idle',
          actions: [
            assign((ctx, {ad}) => ({
              ...ctx,
              ...ad,
            })),
            'change',
          ],
        },
      },
      initial: 'idle',
      states: {
        idle: {},
        invalid: {},
      },
    },
  },
})
