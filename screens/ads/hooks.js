import {useToken} from '@chakra-ui/react'
import {useMachine} from '@xstate/react'
import {assign, createMachine} from 'xstate'
import {log} from 'xstate/lib/actions'
import protobuf from 'protobufjs'
import React from 'react'
import {useAuthState} from '../../shared/providers/auth-context'
import db from '../../shared/utils/db'
import {
  areSameCaseInsensitive,
  byId,
  callRpc,
  eitherState,
} from '../../shared/utils/utils'
import {AdStatus} from './types'
import {
  buildAdReviewVoting,
  fetchTotalSpent,
  isReviewingAd,
  pollContractTx,
  buildAdKeyHex,
  buildProfileHex,
  pollTx,
  fetchProfileAds,
  fetchProfileAd,
  currentOs,
  isTargetedAd,
} from './utils'
import {
  buildContractDeploymentArgs,
  createContractCaller,
  fetchVoting,
  mapVoting,
} from '../oracles/utils'
import {ContractRpcMode} from '../oracles/types'
import {useFailToast} from '../../shared/hooks/use-toast'
import {useIdentity} from '../../shared/providers/identity-context'

export function useAdList() {
  const failToast = useFailToast()

  const {coinbase} = useAuthState()

  const adListMachine = createMachine({
    id: 'adList',
    context: {
      selectedAd: {},
      ads: [],
      filteredAds: [],
      filter: AdStatus.Active,
      totalSpent: 0,
    },
    initial: 'load',
    states: {
      load: {
        invoke: {
          src: 'load',
          onDone: {
            target: 'ready',
            actions: [
              assign({
                ads: (_, {data: {ads}}) => ads,
                filteredAds: ({filter}, {data: {ads}}) =>
                  ads.filter(ad => areSameCaseInsensitive(ad.status, filter)),
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
                      ads.filter(({status}) =>
                        value === AdStatus.Reviewing
                          ? isReviewingAd({status})
                          : areSameCaseInsensitive(status, value)
                      ),
                  }),
                  log(),
                ],
              },
              SEND_AD_TO_REVIEW: {
                target: 'sendToReview',
                actions: [
                  assign({
                    selectedAd: ({ads}, {id}) => ads.find(byId({id})),
                  }),
                ],
              },
              PUBLISH_AD: {
                target: 'publish',
                actions: [
                  assign({
                    selectedAd: ({ads}, {id}) => ads.find(byId({id})),
                  }),
                ],
              },
              REMOVE_AD: 'removeAd',
            },
          },
          sendToReview: {
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
                    target: 'mineDeployVoting',
                    actions: [
                      assign(
                        (
                          // eslint-disable-next-line no-shadow
                          {ads, selectedAd, filter, ...context},
                          {data: {deployVotingTxHash, votingAddress, adCid}}
                        ) => {
                          const mapToReviewingAd = ad => ({
                            ...ad,
                            status: AdStatus.Reviewing,
                            deployVotingTxHash,
                            votingAddress,
                            adCid,
                          })

                          const nextAds = ads.map(ad =>
                            ad.id === selectedAd.id ? mapToReviewingAd(ad) : ad
                          )

                          return {
                            ...context,
                            ads: nextAds,
                            filteredAds: nextAds.filter(
                              ad => ad.status === filter
                            ),
                            selectedAd: mapToReviewingAd(selectedAd),
                          }
                        }
                      ),
                    ],
                  },
                  onError: {actions: ['onError', log()]},
                },
              },
              mineDeployVoting: {
                invoke: {src: 'mineDeployVoting'},
                on: {
                  MINED: 'startVoting',
                  MINING_FAILED: 'miningFailed',
                },
              },
              startVoting: {
                invoke: {
                  src: 'startVoting',
                  onDone: {
                    target: 'mineStartVoting',
                    actions: [
                      assign(
                        (
                          // eslint-disable-next-line no-shadow
                          {ads, selectedAd, filter, ...context},
                          {data: {startVotingTxHash}}
                        ) => {
                          const mapToStartedReviewingAd = ad => ({
                            ...ad,
                            startVotingTxHash,
                          })

                          const nextAds = ads.map(ad =>
                            ad.id === selectedAd.id
                              ? mapToStartedReviewingAd(ad)
                              : ad
                          )

                          return {
                            ...context,
                            ads: nextAds,
                            filteredAds: nextAds.filter(
                              ad => ad.status === filter
                            ),
                            selectedAd: mapToStartedReviewingAd(selectedAd),
                          }
                        }
                      ),
                    ],
                  },
                },
              },
              mineStartVoting: {
                invoke: {src: 'mineStartVoting'},
                on: {
                  MINED: '#adList.ready.idle',
                  MINING_FAILED: 'miningFailed',
                  TX_NULL: {actions: ['onError']},
                },
              },
              miningFailed: {entry: ['onError']},
            },
          },
          publish: {
            on: {
              CANCEL: 'idle',
            },
            initial: 'preview',
            states: {
              preview: {
                entry: [log()],
                on: {SUBMIT: 'submitting'},
              },
              submitting: {
                entry: [log()],
                invoke: {
                  src: 'publishAd',
                  onDone: {
                    target: 'mining',
                    actions: [
                      assign(
                        (
                          // eslint-disable-next-line no-shadow
                          {ads, selectedAd, filter, ...context},
                          {data: {profileChangeHash, profileCid}}
                        ) => {
                          const mapToPublishedAd = ad => ({
                            ...ad,
                            profileChangeHash,
                            profileCid,
                          })

                          const nextAds = ads.map(ad =>
                            ad.id === selectedAd.id ? mapToPublishedAd(ad) : ad
                          )

                          return {
                            ...context,
                            ads: nextAds,
                            filteredAds: nextAds.filter(
                              ad => ad.status === filter
                            ),
                            selectedAd: mapToPublishedAd(selectedAd),
                          }
                        }
                      ),
                      log(),
                    ],
                  },
                  onError: {actions: [log()]},
                },
              },
              mining: {
                invoke: {src: 'pollPublishAd'},
                on: {
                  MINED: '#adList.ready.idle',
                  TX_NULL: {actions: ['onError']},
                },
              },
            },
          },
          removeAd: {
            invoke: {
              src: 'removeAd',
              onDone: {
                target: 'idle',
                actions: [
                  assign({
                    ads: ({ads}, {id}) => ads.filter(ad => ad.id !== id),
                    // eslint-disable-next-line no-shadow
                    filteredAds: ({filteredAds}, {id}) =>
                      filteredAds.filter(ad => ad.id !== id),
                  }),
                ],
              },
              onError: {
                actions: ['onError'],
              },
            },
          },
        },
      },
      fail: {
        entry: ['onError'],
      },
    },
  })

  const [current, send] = useMachine(adListMachine, {
    actions: {
      onError: (_, {data: {message}}) => {
        failToast(message)
      },
    },
    services: {
      load: async () => ({
        ads: await Promise.all(
          (await db.ads.toArray()).map(async ad => ({
            ...ad,
            status: ad.votingAddress
              ? mapVoting(
                  (await fetchVoting({
                    contractHash: ad.votingAddress,
                  }).catch(() => null)) ?? ad
                ).status
              : ad.status,
          }))
        ),
        totalSpent: await fetchTotalSpent(coinbase),
      }),
      sendToReview: async (
        {selectedAd: {id, title, url, cover, author}},
        {from = coinbase, stake = 8000}
      ) => {
        const root = await protobuf.load('/static/pb/profile.proto')

        const AdContentMessage = root.lookupType('profile.AdContent')

        const adContent = AdContentMessage.create({
          id,
          title,
          url,
          cover: new Uint8Array(await cover.arrayBuffer()),
          author,
        })

        const adContentHex = Buffer.from(
          AdContentMessage.encode(adContent).finish()
        ).toString('hex')

        const adCid = await callRpc('ipfs_add', `0x${adContentHex}`, false)

        const voting = buildAdReviewVoting({title, adCid})

        const {contract: votingAddress, gasCost, txFee} = await callRpc(
          'contract_estimateDeploy',
          buildContractDeploymentArgs(
            voting,
            {from, stake},
            ContractRpcMode.Estimate
          )
        )

        const txHash = await callRpc(
          'contract_deploy',
          buildContractDeploymentArgs(voting, {
            from,
            stake,
            gasCost,
            txFee,
          })
        )

        await db
          .table('ads')
          .update(id, {status: AdStatus.Reviewing, votingAddress, adCid})

        return {
          deployVotingTxHash: txHash,
          votingAddress,
          adCid,
        }
      },
      mineDeployVoting: (_, {data: {deployVotingTxHash}}) => cb =>
        pollContractTx(deployVotingTxHash, cb),
      // eslint-disable-next-line no-shadow
      startVoting: async ({selectedAd}, {amount = 1000}) => {
        const {votingAddress} = selectedAd

        console.log({
          selectedAd,
          votingAddress,
        })

        let callContract = createContractCaller({
          contractHash: votingAddress,
          from: coinbase,
          amount,
        })

        const {error, gasCost, txFee} = await callContract(
          'startVoting',
          ContractRpcMode.Estimate
        )

        if (error) throw new Error(error)

        callContract = createContractCaller({
          contractHash: votingAddress,
          from: coinbase,
          amount,
          gasCost: Number(gasCost),
          txFee: Number(txFee),
        })

        return {
          startVotingTxHash: await callContract('startVoting'),
        }
      },
      mineStartVoting: (_, {data: {startVotingTxHash}}) => cb =>
        pollContractTx(startVotingTxHash, cb),
      // eslint-disable-next-line no-shadow
      publishAd: async ({selectedAd}) => {
        const {id, language, age, stake, os, adCid, votingAddress} = selectedAd

        const ads = await fetchProfileAds(coinbase)

        const profileHex = await buildProfileHex([
          ...ads,
          {
            key: {language, age, stake, os},
            cid: adCid,
            votingAddress,
          },
        ])

        const profileCid = await callRpc('ipfs_add', `0x${profileHex}`, false)

        const profileChangeHash = await callRpc('dna_sendChangeProfileTx', {
          sender: coinbase,
          cid: profileCid,
        })

        await callRpc('dna_storeToIpfs', {cid: profileCid})

        await db
          .table('ads')
          .update(id, {adKeyHex: await buildAdKeyHex(selectedAd), profileCid})

        return {
          profileChangeHash,
          profileCid,
        }
      },
      minePublishAd: (_, {data: {profileChangeHash}}) => cb =>
        pollTx(profileChangeHash, cb),
      removeAd: (_, {id}) => db.table('ads').delete(id),
    },
  })

  const eitherCurrentState = (...states) => eitherState(current, ...states)

  return [
    {
      ...current.context,
      ads: current.context.filteredAds,
      isReady: eitherCurrentState('ready'),
      isPublishing: eitherCurrentState('ready.publish'),
      isSendingToReview: eitherCurrentState('ready.sendToReview'),
      isMining: eitherCurrentState(
        'ready.sendToReview.mineDeployVoting',
        'ready.sendToReview.mineStartVoting',
        'ready.publish.mining'
      ),
    },
    {
      filter(value) {
        send('FILTER', {value})
      },
      removeAd(id) {
        send('REMOVE_AD', {id})
      },
      sendAdToReview(id) {
        send('SEND_AD_TO_REVIEW', {id})
      },
      publishAd(id) {
        send('PUBLISH_AD', {id})
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
        src: 'close',
        onDone: {
          actions: [
            assign({
              didSaveDraft: (_, {data}) => Boolean(data),
            }),
            'onBeforeClose',
          ],
        },
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

export function useAdStatusColor(status, fallbackColor = 'gray.500') {
  const statusColor = {
    [AdStatus.Showing]: 'green',
    [AdStatus.NotShowing]: 'red',
    [AdStatus.PartiallyShowing]: 'orange',
  }

  const color = useToken('colors', `${statusColor[status]}.500`, fallbackColor)

  return color
}

export function useAdRotation(limit = 5) {
  const [identity] = useIdentity()

  const [current, send] = useMachine(() =>
    createMachine({
      context: {
        ads: [],
        burntCoins: [],
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            START: 'fetchBurntCoins',
          },
        },
        fetchBurntCoins: {
          invoke: {
            src: async () => {
              const burntCoins = await callRpc('bcn_burntCoins')

              const decodedBurntCoins = await Promise.all(
                (burntCoins ?? []).map(async item => {
                  const AdKeyType = (
                    await protobuf.load('/static/pb/profile.proto')
                  ).lookupType('profile.AdKey')

                  return {
                    ...item,
                    decodedAdKey: AdKeyType.decode(
                      Buffer.from(item.key, 'hex')
                    ),
                  }
                })
              )

              return decodedBurntCoins
            },
            onDone: {
              target: 'fetchAds',
              actions: [
                assign({
                  burntCoins: (_, {data}) =>
                    data
                      .filter(({decodedAdKey}) =>
                        isTargetedAd(
                          {...decodedAdKey},
                          {
                            language: new Intl.Locale(navigator?.language)
                              .language,
                            os: currentOs(),
                            age: identity.age,
                            stake: identity.stake,
                          }
                        )
                      )
                      ?.slice(0, limit) ?? [],
                }),
                log(),
              ],
            },
            onError: {actions: log()},
          },
        },
        fetchAds: {
          invoke: {
            src: ({burntCoins}) =>
              Promise.all(
                burntCoins.map(async ({address, key}) => {
                  const profileAds = await fetchProfileAds(address)

                  const ads = await Promise.all(
                    profileAds
                      .filter(ad => buildAdKeyHex(ad.key) !== key)
                      .map(ad => fetchProfileAd(ad.cid))
                  )
                  return ads[0]
                })
              ),
            onDone: {
              actions: [
                assign({
                  ads: (_, {data}) => data,
                }),
                log(),
              ],
            },
            onError: {
              actions: [log()],
            },
          },
        },
        // checkAds: {
        //   invoke: {
        //     src: ({ads}) =>
        //       ads.filter(async ({votingAddress, ad}) => {
        //         const {state, adHash} = await fetchVoting(votingAddress)
        //         return state === 'approved' && adHash === ad
        //       }),
        //   },
        // },
      },
    })
  )

  React.useEffect(() => {
    if (identity.address) {
      send('START')
    }
  }, [identity.address, send])

  return current.context.ads
}
