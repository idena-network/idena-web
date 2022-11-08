import {Machine, assign, spawn, sendParent} from 'xstate'
import {log, send} from 'xstate/lib/actions'
import nanoid from 'nanoid'
import {Evaluate} from '@idena/vrf-js'
import CID from 'cids'
import {
  fetchKeywordTranslations,
  voteForKeywordTranslation,
  suggestKeywordTranslation,
  publishFlip,
  updateFlipType,
  DEFAULT_FLIP_ORDER,
  createOrUpdateFlip,
  checkIfFlipNoiseEnabled,
} from './utils'
import {callRpc} from '../../shared/utils/utils'
import {shuffle} from '../../shared/utils/arr'
import {FlipType, FlipFilter} from '../../shared/types'
import {fetchTx, fetchWordsSeed, getRawTx, sendRawTx} from '../../shared/api'
import {HASH_IN_MEMPOOL} from '../../shared/hooks/use-tx'
import {persistState} from '../../shared/utils/persist'
import db from '../../shared/utils/db'
import {keywords as allKeywords} from '../../shared/utils/keywords'
import {fetchWordPairs} from '../../shared/api/validation'
import {privateKeyToAddress} from '../../shared/utils/crypto'
import {hexToUint8Array, toHexString} from '../../shared/utils/buffers'
import {FlipDeleteAttachment} from '../../shared/models/flipDeleteAttachment'
import {Transaction} from '../../shared/models/transaction'

export const flipsMachine = Machine(
  {
    id: 'flips',
    context: {
      flips: null,
      knownFlips: [],
      availableKeywords: [],
      canSubmitFlips: null,
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          INITIALIZE: {
            target: 'loadPairs',
            actions: [
              assign({
                privateKey: (_, {privateKey}) => privateKey,
                epoch: (_, {epoch}) => epoch,
                canSubmitFlips: (_, {canSubmitFlips}) => canSubmitFlips,
              }),
            ],
          },
        },
      },
      loadPairs: {
        invoke: {
          src: 'loadWordPairs',
          onDone: {
            target: 'initializing',
            actions: [
              assign({
                availableKeywords: (_, {data}) => data,
              }),
              log(),
            ],
          },
          onError: {
            actions: [log('error while loading key words')],
            target: 'initializing',
          },
        },
      },
      initializing: {
        invoke: {
          src: async ({knownFlips, availableKeywords}) => {
            const persistedFlips = await db.table('ownFlips').toArray()

            const persistedHashes = persistedFlips.map(flip => flip.hash)

            let missingFlips = knownFlips.filter(
              hash => !persistedHashes.includes(hash)
            )

            if (missingFlips.length) {
              const keywords = availableKeywords
                .filter(
                  ({id, used}) =>
                    used &&
                    persistedFlips.some(
                      ({keywordPairId}) => keywordPairId !== id
                    )
                )
                .map(({id, words}) => ({
                  id,
                  words: words.map(idx => allKeywords[idx]),
                }))

              missingFlips = missingFlips.map((hash, idx) => ({
                hash,
                keywords: keywords[idx],
                images: Array.from({length: 4}),
                protectedImages: Array.from({length: 4}),
              }))
            }

            return {persistedFlips, missingFlips}
          },
          onDone: [
            {
              target: 'ready.pristine',
              actions: log(),
              cond: (
                {canSubmitFlips},
                {data: {persistedFlips, missingFlips}}
              ) =>
                !canSubmitFlips &&
                persistedFlips.concat(missingFlips).length === 0,
            },
            {
              target: 'ready.dirty',
              actions: [
                assign({
                  flips: ({privateKey, epoch}, {data: {persistedFlips}}) =>
                    persistedFlips.map(flip => ({
                      ...flip,
                      ref: spawn(
                        // eslint-disable-next-line no-use-before-define
                        flipMachine.withContext({...flip, privateKey, epoch}),
                        `flip-${flip.id}`
                      ),
                    })),
                  missingFlips: (_, {data: {missingFlips}}) => missingFlips,
                }),
                log(),
              ],
            },
          ],
          onError: [
            {
              target: 'ready.pristine',
              actions: [
                assign({
                  flips: [],
                }),
                log(),
              ],
              cond: (_, {data: error}) => error.notFound,
            },
            {
              target: 'failure',
              actions: [
                assign({
                  flips: [],
                }),
                log(),
              ],
            },
          ],
        },
      },
      ready: {
        initial: 'pristine',
        states: {
          pristine: {
            on: {
              FILTER: {
                actions: [
                  assign({
                    filter: (_, {filter}) => filter,
                  }),
                  'persistFilter',
                ],
              },
            },
          },
          dirty: {
            on: {
              FILTER: {
                target: '.unknown',
                actions: [
                  assign({
                    filter: (_, {filter}) => filter,
                  }),
                  'persistFilter',
                  log(),
                ],
              },
              PUBLISHING: {
                actions: [
                  assign({
                    flips: ({flips}, {id}) =>
                      updateFlipType(flips, {id, type: FlipType.Publishing}),
                  }),
                  log(),
                ],
              },
              PUBLISHED: {
                actions: [
                  assign({
                    flips: ({flips}, {id}) =>
                      updateFlipType(flips, {id, type: FlipType.Published}),
                  }),
                  log(),
                ],
              },
              PUBLISH_FAILED: {
                actions: ['onError'],
              },
              DELETING: {
                actions: [
                  assign({
                    flips: ({flips}, {id}) =>
                      updateFlipType(flips, {id, type: FlipType.Deleting}),
                  }),
                  log(),
                ],
              },
              DELETED: {
                actions: [
                  assign({
                    flips: ({flips}, {id}) =>
                      updateFlipType(flips, {id, type: FlipType.Draft}),
                  }),
                  log(),
                ],
              },
              DELETE_FAILED: {
                actions: ['onError'],
              },
              ARCHIVED: {
                actions: [
                  assign({
                    flips: ({flips}, {id}) =>
                      updateFlipType(flips, {id, type: FlipType.Archived}),
                  }),
                  log(),
                ],
              },
              REMOVED: {
                actions: [
                  assign({
                    flips: ({flips}, {id}) =>
                      flips.filter(flip => flip.id !== id),
                  }),
                  log(),
                ],
              },
            },
            initial: 'unknown',
            states: {
              unknown: {
                on: {
                  '': [
                    {
                      target: 'active',
                      cond: ({filter}) => filter === FlipFilter.Active,
                    },
                    {
                      target: 'draft',
                      cond: ({filter}) => filter === FlipFilter.Draft,
                    },
                    {
                      target: 'archived',
                      cond: ({filter}) => filter === FlipFilter.Archived,
                    },
                  ],
                },
              },
              active: {},
              draft: {},
              archived: {},
            },
          },
        },
      },
      failure: {
        entry: log(),
      },
    },
  },
  {
    services: {
      loadWordPairs: async ({privateKey}) => {
        const seed = await fetchWordsSeed()
        const [vrfHash] = Evaluate(privateKey, hexToUint8Array(seed))
        const address = privateKeyToAddress(privateKey)
        return fetchWordPairs(address, toHexString(vrfHash, true))
      },
    },
    actions: {
      persistFilter: ({filter}) => persistState('flipFilter', filter),
    },
  }
)

export const flipMachine = Machine(
  {
    id: 'flip',
    initial: 'checkType',
    states: {
      checkType: {
        on: {
          '': [
            {
              target: 'publishing.mining',
              cond: ({type}) => type === FlipType.Publishing,
            },
            {
              target: 'deleting.mining',
              cond: ({type}) => type === FlipType.Deleting,
            },
            {target: 'idle'},
          ],
        },
      },
      idle: {
        on: {
          PUBLISH: 'publishing',
          DELETE: 'deleting',
          ARCHIVE: {
            actions: [
              assign({
                type: FlipType.Archived,
              }),
              sendParent(({id}) => ({
                type: 'ARCHIVED',
                id,
              })),
              'persistFlip',
            ],
          },
        },
      },
      publishing: {
        initial: 'submitting',
        states: {
          submitting: {
            invoke: {
              src: 'publishFlip',
              onDone: {
                target: 'mining',
                actions: [
                  assign((context, {data: {txHash, hash}}) => ({
                    ...context,
                    txHash,
                    hash,
                    type: FlipType.Publishing,
                  })),
                  sendParent(({id}) => ({
                    type: 'PUBLISHING',
                    id,
                  })),
                  'persistFlip',
                  log(),
                ],
              },
              onError: {
                target: 'failure',
                actions: [
                  assign({
                    error: (_, {data: {message}}) => message,
                  }),
                  sendParent(({error}) => ({type: 'PUBLISH_FAILED', error})),
                  log(),
                ],
              },
            },
          },
          mining: {
            invoke: {
              src: 'pollStatus',
            },
          },
          failure: {
            on: {
              PUBLISH: 'submitting',
            },
          },
        },
        on: {
          MINED: {
            target: 'published',
            actions: [
              assign({type: FlipType.Published}),
              sendParent(({id}) => ({
                type: 'PUBLISHED',
                id,
              })),
              'persistFlip',
              log(),
            ],
          },
          TX_NULL: {
            target: 'invalid',
            actions: [
              assign({
                error: 'Publish tx is missing',
                type: FlipType.Invalid,
              }),
              'persistFlip',
            ],
          },
        },
      },
      published: {
        on: {
          DELETE: 'deleting',
        },
      },
      deleting: {
        initial: 'submitting',
        states: {
          submitting: {
            invoke: {
              src: 'deleteFlip',
              onDone: {
                target: 'mining',
                actions: [
                  assign((context, {data}) => ({
                    ...context,
                    txHash: data,
                    type: FlipType.Deleting,
                  })),
                  sendParent(({id}) => ({
                    type: 'DELETING',
                    id,
                  })),
                  'persistFlip',
                  log(),
                ],
              },
              onError: {
                target: 'failure',
                actions: [
                  assign({
                    error: (_, {data: {message}}) => message,
                  }),
                  sendParent(({error}) => ({type: 'DELETE_FAILED', error})),
                  log(),
                ],
              },
            },
          },
          mining: {
            invoke: {
              src: 'pollStatus',
            },
          },
          failure: {
            on: {
              DELETE: 'submitting',
            },
          },
        },
        on: {
          MINED: {
            target: 'deleted',
            actions: [
              assign({type: FlipType.Draft}),
              sendParent(({id}) => ({
                type: 'DELETED',
                id,
              })),
              'persistFlip',
            ],
          },
          TX_NULL: {
            target: 'invalid',
            actions: [
              assign({
                type: FlipType.Invalid,
                error: 'Delete tx is missing',
              }),
              'persistFlip',
            ],
          },
        },
      },
      deleted: {
        on: {
          PUBLISH: 'publishing',
        },
      },
      invalid: {},
      removed: {
        type: 'final',
      },
    },
  },
  {
    services: {
      publishFlip: context => publishFlip(context),
      deleteFlip: async ({privateKey, hash}) => {
        const from = privateKeyToAddress(privateKey)

        const cid = new CID(hash)
        const attachment = new FlipDeleteAttachment(cid.bytes)

        const rawTx = await getRawTx(
          14,
          from,
          null,
          0,
          0,
          toHexString(attachment.toBytes(), true)
        )

        const tx = new Transaction().fromHex(rawTx)
        tx.sign(privateKey)

        const hex = tx.toHex()

        return sendRawTx(`0x${hex}`)
      },
      pollStatus: ({txHash}) => cb => {
        let timeoutId

        const fetchStatus = async () => {
          const {result} = await fetchTx(txHash)
          if (result) {
            if (result.blockHash !== HASH_IN_MEMPOOL) cb('MINED')
            else {
              timeoutId = setTimeout(fetchStatus, 10 * 1000)
            }
          } else cb('TX_NULL')
        }

        fetchStatus()

        return () => {
          clearTimeout(timeoutId)
        }
      },
    },
    actions: {
      persistFlip: async context => createOrUpdateFlip(context),
    },
  }
)

export const flipMasterMachine = Machine(
  {
    id: 'flipMaster',
    context: {
      keywordPairId: 0,
      keywords: {
        words: [],
        translations: [[], []],
      },
      images: Array.from({length: 4}),
      protectedImages: Array.from({length: 4}),
      originalOrder: DEFAULT_FLIP_ORDER,
      order: DEFAULT_FLIP_ORDER,
      orderPermutations: DEFAULT_FLIP_ORDER,
      didShowBadFlip: true,
    },
    on: {
      SWITCH_LOCALE: {
        actions: [
          assign({
            showTranslation: ({showTranslation}) => !showTranslation,
          }),
        ],
      },
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          PREPARE_FLIP: {
            target: 'loadPairs',
            actions: assign({
              id: (_, {id}) => id,
              privateKey: (_, {privateKey}) => privateKey,
              epoch: (_, {epoch}) => epoch,
            }),
          },
        },
      },
      loadPairs: {
        invoke: {
          src: 'loadWordPairs',
          onDone: {
            target: 'prepare',
            actions: [
              assign({
                wordPairs: (_, {data}) => data,
              }),
              log(),
            ],
          },
          onError: {
            actions: [log('error while loading key words')],
            target: 'prepare',
          },
        },
      },
      prepare: {
        invoke: {
          src: 'prepareFlip',
          onDone: {
            target: 'editing',
            actions: [
              assign((context, {data}) => ({
                ...context,
                ...data,
              })),
              log(),
            ],
          },
          onError: {
            actions: [log('error while preparing flip')],
          },
        },
      },
      editing: {
        initial: 'keywords',
        states: {
          keywords: {
            on: {
              CHANGE_KEYWORDS: {
                target: '.loading',
                actions: assign({
                  keywordPairId: ({keywordPairId, availableKeywords}) => {
                    if (availableKeywords.length === 0) return 0

                    const currentIdx = availableKeywords.findIndex(
                      // eslint-disable-next-line no-shadow
                      ({id}) => id === keywordPairId
                    )
                    const nextIdx = (currentIdx + 1) % availableKeywords.length
                    const {id} = availableKeywords[nextIdx]
                    return id
                  },
                }),
              },
              TOGGLE_COMMUNITY_TRANSLATIONS: {
                actions: [
                  assign({
                    isCommunityTranslationsExpanded: ({
                      isCommunityTranslationsExpanded,
                    }) => !isCommunityTranslationsExpanded,
                  }),
                ],
              },
              NEXT: 'images',
            },
            initial: 'loading',
            states: {
              loading: {
                invoke: {
                  src: 'loadKeywords',
                  onDone: {
                    target: 'loaded',
                    actions: [
                      assign({
                        keywords: ({keywords}, {data}) => ({
                          ...keywords,
                          words: data,
                        }),
                      }),
                      log(),
                    ],
                  },
                  onError: 'failure',
                },
              },
              loaded: {
                initial: 'fetchingTranslations',
                states: {
                  fetchingTranslations: {
                    invoke: {
                      src: 'loadTranslations',
                      onDone: {
                        target: 'fetchedTranslations',
                        actions: [
                          assign({
                            keywords: ({keywords}, {data}) => ({
                              ...keywords,
                              translations: data,
                            }),
                            showTranslation: ({locale}, {data}) =>
                              locale.toLowerCase() !== 'en' &&
                              data?.every(w => w?.some(t => t?.confirmed)),
                          }),
                          log(),
                        ],
                      },
                      onError: 'fetchTranslationsFailed',
                    },
                  },
                  fetchedTranslations: {
                    on: {
                      REFETCH: 'fetchingTranslations',
                    },
                    initial: 'idle',
                    states: {
                      idle: {
                        on: {
                          VOTE: 'voting',
                          SUGGEST: 'suggesting',
                        },
                      },
                      voting: {
                        invoke: {
                          src: 'voteForKeywordTranslation',
                          onDone: {
                            target: 'idle',
                            actions: [send('REFETCH'), log()],
                          },
                          onError: {
                            target: 'idle',
                            actions: ['onError', log()],
                          },
                        },
                      },
                      suggesting: {
                        invoke: {
                          src: 'suggestKeywordTranslation',
                          onDone: {
                            target: 'idle',
                            actions: [send('REFETCH'), log()],
                          },
                          onError: {
                            target: 'idle',
                            actions: ['onError', log()],
                          },
                        },
                      },
                    },
                  },
                  fetchTranslationsFailed: {},
                },
              },
              failure: {
                entry: [log()],
              },
            },
          },
          images: {
            on: {
              CHANGE_IMAGES: {
                target: '.persisting',
                actions: [
                  assign({
                    images: ({images}, {image, currentIndex}) => [
                      ...images.slice(0, currentIndex),
                      image,
                      ...images.slice(currentIndex + 1),
                    ],
                  }),
                  log(),
                ],
              },
              CHANGE_ORIGINAL_ORDER: {
                target: '.persisting',
                actions: [
                  assign({
                    originalOrder: (_, {order}) => order,
                    order: (_, {order}) => order,
                  }),
                  log(),
                ],
              },
              PAINTING: '.painting',
              NEXT: [
                {
                  target: 'protect',
                  cond: 'isFlipNoiseEnabled',
                },
                {
                  target: 'shuffle',
                },
              ],
              PREV: 'keywords',
            },
            initial: 'idle',
            states: {
              idle: {},
              painting: {},
              persisting: {
                invoke: {
                  id: 'persistFlip',
                  src: 'persistFlip',
                },
                on: {
                  PERSISTED: {
                    target: 'idle',
                    actions: [
                      assign((context, {flip}) => ({...context, ...flip})),
                      log(),
                    ],
                  },
                },
              },
            },
          },
          protect: {
            on: {
              CHANGE_PROTECTED_IMAGES: {
                target: '.idle',
                actions: [
                  assign({
                    protectedImages: (
                      {protectedImages},
                      {image, currentIndex}
                    ) => [
                      ...protectedImages.slice(0, currentIndex),
                      image,
                      ...protectedImages.slice(currentIndex + 1),
                    ],
                  }),
                  log(),
                ],
              },
              PROTECTING: '.protecting',
              NEXT: 'shuffle',
              PREV: {
                target: 'images',
                actions: [
                  assign({
                    protectedImages: Array.from({length: 4}),
                  }),
                ],
              },
            },
            initial: 'idle',
            states: {
              idle: {
                on: {
                  '': [
                    {
                      target: 'protecting',
                      cond: ({images, protectedImages}) =>
                        images.some(x => x) && !protectedImages.some(x => x),
                    },
                  ],
                },
              },
              protecting: {
                invoke: {
                  src: 'protectFlip',
                  onDone: {
                    target: 'idle',
                    actions: [
                      assign((context, {data: {protectedImages}}) => ({
                        ...context,
                        protectedImages,
                      })),
                      log(),
                    ],
                  },
                },
              },
            },
          },
          shuffle: {
            on: {
              SHUFFLE: {
                actions: [
                  send(({order}) => ({
                    type: 'CHANGE_ORDER',
                    order: shuffle(order.slice()),
                  })),
                  log(),
                ],
              },
              MANUAL_SHUFFLE: {
                actions: [
                  send((_, {order}) => ({
                    type: 'CHANGE_ORDER',
                    order,
                  })),
                  log(),
                ],
              },
              RESET_SHUFFLE: {
                actions: [
                  send(({originalOrder}) => ({
                    type: 'CHANGE_ORDER',
                    order: originalOrder,
                  })),
                  log(),
                ],
              },
              CHANGE_ORDER: {
                target: '.persisting',
                actions: ['changeOrder', log()],
              },
              NEXT: 'submit',
              PREV: [
                {
                  target: 'protect',
                  cond: 'isFlipNoiseEnabled',
                },
                {
                  target: 'images',
                },
              ],
            },
            initial: 'idle',
            states: {
              idle: {},
              persisting: {
                invoke: {
                  id: 'persistFlip',
                  src: 'persistFlip',
                },
                on: {
                  PERSISTED: {
                    target: 'idle',
                    actions: [
                      assign((context, {flip}) => ({...context, ...flip})),
                      log(),
                    ],
                  },
                },
              },
            },
          },
          submit: {
            on: {
              SUBMIT: '.submitting',
              PREV: 'shuffle',
            },
            initial: 'idle',
            states: {
              idle: {},
              submitting: {
                invoke: {
                  src: 'submitFlip',
                  onDone: {
                    target: 'mining',
                    actions: [
                      assign((context, {data: {txHash, hash}}) => ({
                        ...context,
                        txHash,
                        hash,
                        type: FlipType.Publishing,
                      })),
                      'persistFlip',
                    ],
                  },
                  onError: {target: 'failure', actions: [log()]},
                },
              },
              mining: {
                on: {
                  FLIP_MINED: 'done',
                },
              },
              done: {
                entry: ['onSubmitted', log()],
              },
              failure: {entry: ['onError']},
            },
          },
        },
        on: {
          PICK_IMAGES: '.images',
          PICK_PROTECT: '.protect',
          PICK_KEYWORDS: '.keywords',
          PICK_SHUFFLE: '.shuffle',
          PICK_SUBMIT: '.submit',
          SKIP_BAD_FLIP: {actions: [assign({didShowBadFlip: () => true})]},
        },
      },
    },
  },
  {
    services: {
      loadWordPairs: async ({privateKey}) => {
        const seed = await fetchWordsSeed()
        const [vrfHash] = Evaluate(privateKey, hexToUint8Array(seed))
        const address = privateKeyToAddress(privateKey)
        return fetchWordPairs(address, toHexString(vrfHash, true))
      },
      loadKeywords: async ({availableKeywords, keywordPairId}) => {
        const {words} = availableKeywords.find(({id}) => id === keywordPairId)
        return words.map(id => ({id, ...allKeywords[id]}))
      },
      loadTranslations: async ({availableKeywords, keywordPairId, locale}) => {
        const {words} = availableKeywords.find(({id}) => id === keywordPairId)
        return fetchKeywordTranslations(words, locale)
      },
      persistFlip: (
        {
          id,
          keywordPairId,
          originalOrder,
          order,
          orderPermutations,
          images,
          protectedImages,
          keywords,
          type,
          createdAt,
        },
        event
      ) => cb => {
        const persistingEventTypes = [
          'CHANGE_IMAGES',
          'CHANGE_ORIGINAL_ORDER',
          'CHANGE_ORDER',
        ]

        if (persistingEventTypes.includes(event.type)) {
          let nextFlip = {
            keywordPairId,
            originalOrder,
            order,
            orderPermutations,
            images,
            protectedImages,
            keywords,
          }

          nextFlip = id
            ? {
                ...nextFlip,
                id,
                type,
                createdAt,
                modifiedAt: new Date().toISOString(),
              }
            : {
                ...nextFlip,
                id: nanoid(),
                createdAt: new Date().toISOString(),
                type: FlipType.Draft,
              }

          createOrUpdateFlip(nextFlip).then(() =>
            cb({type: 'PERSISTED', flip: nextFlip})
          )
        }
      },
      voteForKeywordTranslation: async (_, e) => voteForKeywordTranslation(e),
      suggestKeywordTranslation: async (
        // eslint-disable-next-line no-shadow
        {keywords: {words}, locale},
        {name, desc, wordIdx, pk}
      ) =>
        suggestKeywordTranslation(
          {
            wordId: words[wordIdx].id,
            name,
            desc,
            locale,
          },
          pk
        ),
    },
    actions: {
      changeOrder: assign({
        order: (_, {order}) => order,
        orderPermutations: ({originalOrder}, {order}) =>
          order.map(n => originalOrder.findIndex(o => o === n)),
      }),
      persistFlip: async context => createOrUpdateFlip(context),
    },
    guards: {
      isFlipNoiseEnabled: ({epoch}) => checkIfFlipNoiseEnabled(epoch),
    },
  }
)

export const createViewFlipMachine = () =>
  Machine(
    {
      context: {
        keywords: {
          words: [],
          translations: [],
        },
        order: [],
        originalOrder: [],
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            LOAD: {
              target: 'loading',
              actions: assign({
                id: (_, {id}) => id,
              }),
            },
          },
        },
        loading: {
          invoke: {
            src: 'loadFlip',
            onDone: {
              target: 'fetchingTranslations',
              actions: [
                assign((context, {data}) => ({...context, ...data})),
                log(),
              ],
            },
          },
        },
        fetchingTranslations: {
          invoke: {
            src: 'loadTranslations',
            onDone: {
              target: 'loaded',
              actions: [
                assign({
                  keywords: ({keywords}, {data}) => ({
                    ...keywords,
                    translations: data,
                  }),
                  showTranslation: ({locale}, {data}) =>
                    locale.toLowerCase() !== 'en' &&
                    data?.every(w => w?.some(t => t?.confirmed)),
                }),
                send('LOADED'),
                log(),
              ],
            },
            onError: 'loaded',
          },
        },
        loaded: {
          on: {
            DELETE: '.deleting',
            ARCHIVE: {
              actions: [
                assign({
                  type: FlipType.Archived,
                }),
                'onDeleted',
                'persistFlip',
              ],
            },
            SWITCH_LOCALE: {
              actions: [
                assign({
                  showTranslation: ({showTranslation}) => !showTranslation,
                }),
              ],
            },
          },
          initial: 'idle',
          states: {
            idle: {},
            deleting: {
              initial: 'submitting',
              states: {
                submitting: {
                  invoke: {
                    src: 'deleteFlip',
                    onDone: {
                      actions: [
                        assign((context, {data}) => ({
                          ...context,
                          txHash: data,
                          type: FlipType.Deleting,
                        })),
                        'persistFlip',
                        'onDeleted',
                        log(),
                      ],
                    },
                    onError: {
                      target: 'failure',
                      actions: [
                        assign({
                          error: (_, {data: {message}}) => message,
                        }),
                        'onDeleteFailed',
                        log(),
                      ],
                    },
                  },
                },
                failure: {
                  on: {
                    DELETE: 'submitting',
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      services: {
        deleteFlip: async ({hash}) => callRpc('flip_delete', hash),
        loadTranslations: async ({keywords, locale}) =>
          fetchKeywordTranslations(
            (keywords?.words ?? []).map(({id: wordId}) => wordId),
            locale
          ),
      },
      actions: {
        persistFlip: async context => createOrUpdateFlip(context),
      },
    }
  )
