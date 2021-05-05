import {Machine, assign} from 'xstate'
import {decode} from 'rlp'
import {choose, log, send} from 'xstate/lib/actions'
import dayjs from 'dayjs'
import {Evaluate} from '@idena/vrf-js'
import BN from 'bn.js'
import {
  fetchFlipHashes,
  fetchValidationIsReady,
  fetchPrivateEncryptionKeyCandidates,
  sendPrivateEncryptionKeysPackage,
  sendPublicEncryptionKey,
} from '../../shared/api/validation'
import {sendRawTx, getRawTx} from '../../shared/api/chain'
import {SessionType} from '../../shared/types'
import {fetchFlipKeys, fetchRawFlip} from '../../shared/api'
import {fetchWordsSeed, fetchIdentity} from '../../shared/api/dna'
import apiClient from '../../shared/api/api-client'
import {
  filterRegularFlips,
  filterSolvableFlips,
  flipExtraFlip,
  availableExtraFlip,
  failedFlip,
  hasEnoughAnswers,
  shouldTranslate,
  availableReportsNumber,
  decodedWithoutKeywords,
} from './utils'
import {forEachAsync, wait} from '../../shared/utils/fn'
import {fetchConfirmedKeywordTranslations} from '../flips/utils'
import {
  prepareFlipKeysPackage,
  decryptMessage,
  createShortAnswersHash,
  privateKeyToAddress,
  serializeAnswers,
  generateFlipKey,
  generateShortAnswersSalt,
  preparePublicFlipKey,
} from '../../shared/utils/crypto'
import {keywords} from '../../shared/utils/keywords'
import {Transaction} from '../../shared/models/transaction'
import {toHexString, hexToUint8Array} from '../../shared/utils/buffers'
import {ShortAnswerAttachment} from '../../shared/models/shortAnswerAttachment'
import {LongAnswerAttachment} from '../../shared/models/longAnswerAttachment'
import db from '../../shared/utils/db'

export const createValidationFlipsMachine = () =>
  Machine(
    {
      id: 'validationFlips',
      initial: 'idle',
      context: {
        validationReady: false,
        flipHashes: [],
        retries: 0,
      },
      states: {
        idle: {
          entry: log('validation flips idle'),
          on: {
            START: {
              target: 'working',
              actions: assign({
                shortReady: false,
                longReady: false,
                validationReady: false,
                flipHashes: [],
                retries: 0,
                authorCandidates: [],
                packageSent: false,
                privateKey: (_, {privateKey}) => privateKey,
                coinbase: (_, {coinbase}) => coinbase,
                epoch: (_, {epoch}) => epoch,
              }),
            },
          },
        },
        working: {
          type: 'parallel',
          states: {
            loading: {
              initial: 'checkingValidation',
              states: {
                checkingValidation: {
                  initial: 'fetching',
                  states: {
                    fetching: {
                      entry: log('Fetching is validation ready'),
                      invoke: {
                        src: 'fetchValidationIsReady',
                        onDone: {
                          target: 'check',
                          actions: [
                            assign({
                              validationReady: (_, {data}) => data,
                            }),
                            log(),
                          ],
                        },
                        onError: {
                          actions: [log()],
                        },
                      },
                    },
                    check: {
                      entry: log(),
                      after: {
                        1000: [
                          {
                            target: '#validationFlips.working.loading.lottery',
                            cond: 'isValidationReady',
                          },
                          {target: 'fetching'},
                        ],
                      },
                    },
                  },
                },
                lottery: {
                  type: 'parallel',
                  states: {
                    fetchHashes: {
                      type: 'parallel',
                      states: {
                        fetchShortHashes: {
                          entry: log('fetching short hashes'),
                          invoke: {
                            src: 'fetchShortHashes',
                            onDone: {
                              actions: [
                                assign({
                                  flipHashes: ({flipHashes}, {data}) =>
                                    mergeHashes(
                                      flipHashes,
                                      data.map(x => x.hash)
                                    ),
                                  shortReady: true,
                                }),
                                log(),
                              ],
                            },
                          },
                        },
                        fetchLongHashes: {
                          entry: log('fetching long hashes'),
                          invoke: {
                            src: 'fetchLongHashes',
                            onDone: {
                              actions: [
                                assign({
                                  flipHashes: ({flipHashes}, {data}) =>
                                    mergeHashes(
                                      flipHashes,
                                      data.map(x => x.hash)
                                    ),
                                  longReady: true,
                                }),
                                log(),
                              ],
                            },
                          },
                        },
                      },
                    },
                    fetchRawFlips: {
                      entry: log('start fetching raw flips'),
                      initial: 'fetching',
                      states: {
                        fetching: {
                          invoke: {
                            src: 'fetchRawFlips',
                            onDone: {
                              target: 'check',
                              actions: [
                                assign({
                                  retries: ({retries}) => retries + 1,
                                }),
                              ],
                            },
                          },
                          on: {
                            FLIP: {
                              actions: [
                                assign({
                                  flipHashes: ({flipHashes}, {flip}) =>
                                    removeByHash(flipHashes, flip.hash),
                                }),
                                'saveFlip',
                                log(),
                              ],
                            },
                          },
                        },
                        check: {
                          after: {
                            5000: [
                              {
                                target: '#validationFlips.idle',
                                cond: ({
                                  shortReady,
                                  longReady,
                                  flipHashes,
                                  retries,
                                }) =>
                                  (shortReady &&
                                    longReady &&
                                    flipHashes.length === 0) ||
                                  retries > 10,
                                actions: ({retries}) => {
                                  log(
                                    `flips loading finished, retries: ${retries}`
                                  )
                                },
                              },
                              {target: 'fetching'},
                            ],
                          },
                        },
                      },
                    },
                    sendingPrivateKeyPackage: {
                      initial: 'getIdentityState',
                      entry: log('sending keys package'),
                      states: {
                        getIdentityState: {
                          entry: log('get identity state'),
                          invoke: {
                            src: 'fetchIdentity',
                            onDone: [
                              {
                                target: 'requestingCandidates',
                                cond: (_, {data: {requiredFlips, madeFlips}}) =>
                                  requiredFlips > 0 &&
                                  madeFlips >= requiredFlips,
                                actions: log('candidates received'),
                              },
                              {
                                actions: log(
                                  'candidate does not meet a requirement to send keys package'
                                ),
                              },
                            ],
                            onError: {
                              target: 'fail',
                            },
                          },
                        },
                        requestingCandidates: {
                          entry: log('requesting candidates'),
                          invoke: {
                            src: 'fetchPrivateEncryptionKeyCandidates',
                            onDone: {
                              target: 'sendingPackage',
                              actions: [
                                assign({
                                  authorCandidates: (_, {data}) => data,
                                }),
                                log(),
                              ],
                            },
                            onError: {
                              target: 'fail',
                            },
                          },
                        },
                        sendingPackage: {
                          entry: log('sending package'),
                          invoke: {
                            src: 'sendPrivateEncryptionKeysPackage',
                            onDone: {
                              actions: [
                                assign({
                                  packageSent: true,
                                }),
                                log(),
                              ],
                            },
                            onError: {
                              target: 'fail',
                            },
                          },
                        },
                        fail: {
                          entry: log('retry package sending'),
                          after: {
                            1000: 'requestingCandidates',
                          },
                          actions: [log()],
                        },
                      },
                    },
                  },
                },
              },
            },
            waiting: {
              on: {
                STOP: '#validationFlips.idle',
              },
            },
          },
        },
      },
    },
    {
      actions: {
        saveFlip: async (ctx, {flip}) => {
          if (!flip.fromStorage) {
            await saveFlipToIndexedDb(ctx.epoch, flip)
          }
        },
      },
      services: {
        fetchIdentity: ({coinbase}) => fetchIdentity(coinbase),
        fetchRawFlips: ({flipHashes}) => cb =>
          fetchRawFlips(flipHashes, cb, 1000),
        fetchValidationIsReady: () => fetchValidationIsReady(),
        fetchShortHashes: ({coinbase}) =>
          fetchFlipHashes(coinbase, SessionType.Short),
        fetchLongHashes: ({coinbase}) =>
          fetchFlipHashes(coinbase, SessionType.Long),
        fetchPrivateEncryptionKeyCandidates: ({privateKey}) =>
          fetchPrivateEncryptionKeyCandidates(privateKeyToAddress(privateKey)),
        sendPrivateEncryptionKeysPackage: ({
          packageSent,
          authorCandidates,
          privateKey,
          epoch,
        }) =>
          packageSent
            ? Promise.resolve()
            : sendKeysPackage(authorCandidates, epoch, privateKey),
      },
      guards: {
        isValidationReady: ({validationReady}) => validationReady,
        allFlipsFetched: ({shortReady, longReady, flipHashes}) =>
          shortReady && longReady && flipHashes.length === 0,
      },
    }
  )

export const createValidationMachine = ({
  coinbase,
  privateKey,
  epoch,
  validationStart,
  shortSessionDuration,
  longSessionDuration,
  locale,
}) =>
  Machine(
    {
      id: 'validation',
      initial: 'shortSession',
      context: {
        coinbase,
        privateKey,
        shortFlips: [],
        longFlips: [],
        currentIndex: 0,
        epoch,
        validationStart,
        shortSessionDuration,
        longSessionDuration,
        errorMessage: null,
        retries: 0,
        locale,
        translations: {},
        reportedFlipsCount: 0,
      },
      states: {
        shortSession: {
          entry: log('VALIDATION STARTED!'),
          type: 'parallel',
          states: {
            sendPublicKey: {
              entry: log('sending public flip key'),
              initial: 'getIdentityState',
              states: {
                getIdentityState: {
                  entry: log('get identity state'),
                  invoke: {
                    src: 'fetchIdentity',
                    onDone: [
                      {
                        target: 'sendKey',
                        cond: (_, {data: {requiredFlips, madeFlips}}) =>
                          requiredFlips > 0 && madeFlips >= requiredFlips,
                      },
                      {
                        actions: log(
                          'candidate does not meet a requirement to send public key'
                        ),
                      },
                    ],
                    onError: {
                      target: 'fail',
                    },
                  },
                },
                sendKey: {
                  invoke: {
                    src: 'sendPublicFlipKey',
                    onDone: {
                      actions: [
                        assign({
                          publicKeySent: new Date().getTime(),
                        }),
                      ],
                    },
                    onError: {
                      target: 'fail',
                    },
                  },
                },
                fail: {
                  entry: log('retry public flip sending'),
                  after: {
                    1000: 'sendKey',
                  },
                  actions: [log()],
                },
              },
            },
            fetch: {
              entry: log('Start fetching short flips'),
              initial: 'polling',
              states: {
                polling: {
                  type: 'parallel',
                  states: {
                    fetchHashes: {
                      initial: 'fetching',
                      states: {
                        fetching: {
                          entry: log('Fetching short hashes'),
                          invoke: {
                            src: 'fetchShortHashes',
                            onDone: {
                              actions: [
                                assign({
                                  shortFlips: ({shortFlips}, {data}) =>
                                    shortFlips.length
                                      ? mergeFlipsByHash(
                                          shortFlips,
                                          data.filter(({hash}) =>
                                            shortFlips.find(
                                              f => f.hash === hash && !f.flipped
                                            )
                                          )
                                        )
                                      : mergeFlipsByHash(data, shortFlips),
                                  shortHashes: (ctx, {data}) =>
                                    data.map(x => x.hash),
                                }),
                              ],
                            },
                          },
                        },
                      },
                    },
                    fetchFlips: {
                      initial: 'fetching',
                      states: {
                        fetching: {
                          entry: log('Fetching short flips'),
                          invoke: {
                            src: 'fetchShortFlips',
                            onDone: {
                              target: 'check',
                              actions: [
                                assign({
                                  retries: ({retries}) => retries + 1,
                                }),
                              ],
                            },
                          },
                          on: {
                            FLIP: {
                              actions: [
                                assign({
                                  shortFlips: ({shortFlips, retries}, {flip}) =>
                                    mergeFlipsByHash(shortFlips, [
                                      {...flip, retries},
                                    ]),
                                }),
                                choose([
                                  {
                                    actions: [log()],
                                    cond: (_, {flip}) => flip.fetched,
                                  },
                                ]),
                              ],
                            },
                          },
                        },
                        check: {
                          after: {
                            1000: [
                              {
                                target: '#validation.shortSession.fetch.done',
                                cond: 'didFetchShortFlips',
                              },
                              {target: 'fetching'},
                            ],
                          },
                        },
                      },
                    },
                  },
                },
                extraFlips: {
                  entry: log('Bump extra flips'),
                  invoke: {
                    src: ({shortFlips}) => cb => {
                      const extraFlips = shortFlips.filter(availableExtraFlip)
                      const replacingFlips = shortFlips.filter(failedFlip)
                      cb({
                        type: 'EXTRA_FLIPS_PULLED',
                        flips:
                          extraFlips.length >= replacingFlips.length
                            ? replacingFlips
                                .map(flipExtraFlip)
                                .concat(
                                  extraFlips
                                    .slice(0, replacingFlips.length)
                                    .map(flipExtraFlip)
                                )
                            : replacingFlips
                                .slice(0, extraFlips.length)
                                .map(flipExtraFlip)
                                .concat(extraFlips.map(flipExtraFlip)),
                      })
                    },
                  },
                  on: {
                    EXTRA_FLIPS_PULLED: {
                      target: 'polling',
                      actions: [
                        assign({
                          shortFlips: ({shortFlips}, {flips}) =>
                            mergeFlipsByHash(shortFlips, flips),
                        }),
                      ],
                    },
                  },
                },
                done: {type: 'final', entry: log('Fetching short flips done')},
              },
              on: {
                REFETCH_FLIPS: {
                  target: '#validation.shortSession.fetch.polling.fetchFlips',
                  actions: [
                    assign({
                      shortFlips: ({shortFlips}) =>
                        shortFlips.map(flip => ({
                          ...flip,
                          fetched: false,
                          decoded: false,
                        })),
                    }),
                    log('Re-fetching flips after re-entering short session'),
                  ],
                },
              },
              after: {
                BUMP_EXTRA_FLIPS: {
                  target: '.extraFlips',
                  cond: ({shortFlips}) =>
                    shortFlips.some(failedFlip) &&
                    shortFlips.some(availableExtraFlip),
                },
                FINALIZE_FLIPS: {
                  target: '.done',
                  actions: [
                    assign({
                      shortFlips: ({shortFlips}) =>
                        mergeFlipsByHash(
                          shortFlips,
                          shortFlips.filter(failedFlip).map(flip => ({
                            ...flip,
                            failed: true,
                          }))
                        ),
                    }),
                    log('Flip finalizing done'),
                  ],
                },
              },
            },
            solve: {
              type: 'parallel',
              states: {
                nav: {
                  initial: 'firstFlip',
                  states: {
                    firstFlip: {},
                    normal: {},
                    lastFlip: {},
                  },
                  on: {
                    PREV: [
                      {
                        target: undefined,
                        cond: ({shortFlips}) =>
                          filterRegularFlips(shortFlips).length === 0,
                      },
                      {
                        target: '.normal',
                        cond: ({currentIndex}) => currentIndex > 1,
                        actions: [
                          assign({
                            currentIndex: ({currentIndex}) => currentIndex - 1,
                          }),
                        ],
                      },
                      {
                        target: '.firstFlip',
                        cond: ({currentIndex}) => currentIndex === 1,
                        actions: [
                          assign({
                            currentIndex: ({currentIndex}) => currentIndex - 1,
                          }),
                        ],
                      },
                    ],
                    NEXT: [
                      {
                        target: undefined,
                        cond: ({shortFlips}) =>
                          filterRegularFlips(shortFlips).length === 0,
                      },
                      {
                        target: '.lastFlip',
                        cond: ({currentIndex, shortFlips}) =>
                          currentIndex ===
                          filterRegularFlips(shortFlips).length - 2,
                        actions: [
                          assign({
                            currentIndex: ({currentIndex}) => currentIndex + 1,
                          }),
                        ],
                      },
                      {
                        target: '.normal',
                        cond: ({currentIndex, shortFlips}) =>
                          currentIndex <
                          filterRegularFlips(shortFlips).length - 2,
                        actions: [
                          assign({
                            currentIndex: ({currentIndex}) => currentIndex + 1,
                          }),
                        ],
                      },
                    ],
                    PICK: [
                      {
                        target: '.firstFlip',
                        cond: (_, {index}) => index === 0,
                        actions: [
                          assign({
                            currentIndex: (_, {index}) => index,
                          }),
                        ],
                      },
                      {
                        target: '.lastFlip',
                        cond: ({shortFlips}, {index}) =>
                          index === filterRegularFlips(shortFlips).length - 1,
                        actions: [
                          assign({
                            currentIndex: (_, {index}) => index,
                          }),
                        ],
                      },
                      {
                        target: '.normal',
                        actions: [
                          assign({
                            currentIndex: (_, {index}) => index,
                          }),
                        ],
                      },
                    ],
                  },
                },
                answer: {
                  initial: 'normal',
                  states: {
                    normal: {
                      on: {
                        ANSWER: {
                          actions: [
                            assign({
                              shortFlips: ({shortFlips}, {hash, option}) =>
                                mergeFlipsByHash(shortFlips, [{hash, option}]),
                            }),
                            log(
                              (_, {hash, option}) =>
                                `Make answer, hash: ${hash}, option: ${option}`
                            ),
                          ],
                        },
                        SUBMIT: {
                          target: 'submitShortSession',
                        },
                      },
                      after: {
                        SHORT_SESSION_AUTO_SUBMIT: [
                          {
                            target: 'submitShortSession',
                            cond: ({shortFlips}) =>
                              hasEnoughAnswers(shortFlips),
                          },
                          {
                            target: '#validation.validationFailed',
                          },
                        ],
                      },
                    },
                    submitShortSession: {
                      initial: 'submitHash',
                      entry: log('Submit short answers hash'),
                      states: {
                        submitHash: {
                          invoke: {
                            // eslint-disable-next-line no-shadow
                            src: ({
                              shortHashes,
                              shortFlips,
                              shortHashSubmitted,
                            }) =>
                              shortHashSubmitted
                                ? Promise.resolve()
                                : submitShortAnswersHashTx(
                                    privateKey,
                                    epoch,
                                    shortHashes,
                                    shortFlips.map(
                                      ({option: answer = 0, hash}) => ({
                                        answer,
                                        hash,
                                      })
                                    )
                                  ),
                            onDone: {
                              target: '#validation.longSession',
                              actions: [
                                assign({
                                  shortHashSubmitted: new Date().getTime(),
                                }),
                                log('Short answers hash sent'),
                              ],
                            },
                            onError: {
                              target: 'fail',
                              actions: [
                                assign({
                                  errorMessage: (_, {data}) => data,
                                }),
                                log(),
                              ],
                            },
                          },
                        },
                        fail: {
                          on: {
                            RETRY_SUBMIT: {
                              target: 'submitHash',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          exit: ['cleanupShortFlips'],
        },
        longSession: {
          entry: [
            assign({
              currentIndex: 0,
              retries: 0,
            }),
            log('Entering long session'),
          ],
          type: 'parallel',
          states: {
            fetch: {
              initial: 'fetchHashes',
              entry: log('Start fetching long flips'),
              states: {
                fetchHashes: {
                  entry: log('Fetching long hashes'),
                  invoke: {
                    src: 'fetchLongHashes',
                    onDone: {
                      target: 'fetchFlips',
                      actions: [
                        assign({
                          longFlips: ({longFlips}, {data}) =>
                            mergeFlipsByHash(
                              ...(longFlips.length
                                ? [longFlips, data]
                                : [data, longFlips])
                            ),
                          longHashes: (ctx, {data}) => data.map(x => x.hash),
                        }),
                      ],
                    },
                    onError: {
                      target: 'fetchHashes',
                      actions: log(),
                    },
                  },
                },
                fetchFlips: {
                  invoke: {
                    src: 'fetchLongFlips',
                    onDone: [
                      {
                        target: 'check',
                        actions: [
                          assign({
                            retries: ({retries}) => retries + 1,
                          }),
                        ],
                      },
                    ],
                    onError: {
                      target: 'check',
                    },
                  },
                },
                check: {
                  after: {
                    5000: [
                      {
                        target: 'fetchFlips',
                        cond: ({longFlips}) =>
                          longFlips.some(
                            ({time}) =>
                              time &&
                              dayjs()
                                .subtract(3, 'minute')
                                .isBefore(time)
                          ) && longFlips.some(({decoded}) => !decoded),
                      },
                      {
                        target: 'done',
                        actions: [
                          assign({
                            longFlips: ({longFlips}) =>
                              mergeFlipsByHash(
                                longFlips,
                                longFlips.filter(failedFlip).map(flip => ({
                                  ...flip,
                                  failed: true,
                                }))
                              ),
                          }),
                        ],
                      },
                    ],
                  },
                },
                done: {
                  type: 'final',
                  entry: log('Fetching long flips done'),
                },
              },
              on: {
                FLIP: {
                  actions: [
                    assign({
                      longFlips: ({longFlips, retries}, {flip}) =>
                        mergeFlipsByHash(longFlips, [{...flip, retries}]),
                    }),
                    choose([
                      {
                        actions: [log()],
                        cond: (_, {flip}) => flip.fetched,
                      },
                    ]),
                  ],
                },
                REFETCH_FLIPS: {
                  target: '.fetchFlips',
                  actions: [
                    assign({
                      longFlips: ({longFlips}) =>
                        longFlips.map(flip => ({
                          ...flip,
                          fetched: false,
                          decoded: false,
                        })),
                    }),
                    log('Re-fetch long flips after rebooting the app'),
                  ],
                },
              },
            },
            solve: {
              type: 'parallel',
              states: {
                nav: {
                  initial: 'firstFlip',
                  states: {
                    // eslint-disable-next-line no-use-before-define
                    firstFlip: stepStates,
                    // eslint-disable-next-line no-use-before-define
                    normal: stepStates,
                    // eslint-disable-next-line no-use-before-define
                    lastFlip: stepStates,
                  },
                  on: {
                    PREV: [
                      {
                        target: undefined,
                        cond: ({longFlips}) => longFlips.length === 0,
                      },
                      {
                        target: '.normal',
                        cond: ({currentIndex}) => currentIndex > 1,
                        actions: [
                          assign({
                            currentIndex: ({currentIndex}) => currentIndex - 1,
                          }),
                        ],
                      },
                      {
                        target: '.firstFlip',
                        cond: ({currentIndex}) => currentIndex === 1,
                        actions: [
                          assign({
                            currentIndex: ({currentIndex}) => currentIndex - 1,
                          }),
                        ],
                      },
                    ],
                    NEXT: [
                      {
                        target: undefined,
                        cond: ({longFlips}) => longFlips.length === 0,
                      },
                      {
                        target: '.lastFlip',
                        cond: ({longFlips, currentIndex}) =>
                          currentIndex ===
                          longFlips.filter(({decoded}) => decoded).length - 2,
                        actions: [
                          assign({
                            currentIndex: ({currentIndex}) => currentIndex + 1,
                          }),
                        ],
                      },
                      {
                        target: '.normal',
                        cond: ({longFlips, currentIndex}) =>
                          currentIndex < longFlips.length - 2,
                        actions: [
                          assign({
                            currentIndex: ({currentIndex}) => currentIndex + 1,
                          }),
                        ],
                      },
                    ],
                    PICK: [
                      {
                        target: '.firstFlip',
                        cond: (_, {index}) => index === 0,
                        actions: [
                          assign({
                            currentIndex: (_, {index}) => index,
                          }),
                        ],
                      },
                      {
                        target: '.lastFlip',
                        cond: ({longFlips}, {index}) =>
                          index ===
                          longFlips.filter(({decoded}) => decoded).length - 1,
                        actions: [
                          assign({
                            currentIndex: (_, {index}) => index,
                          }),
                        ],
                      },
                      {
                        target: '.normal',
                        actions: [
                          assign({
                            currentIndex: (_, {index}) => index,
                          }),
                        ],
                      },
                    ],
                  },
                },
                answer: {
                  initial: 'welcomeQualification',
                  states: {
                    welcomeQualification: {
                      on: {
                        START_LONG_SESSION: 'flips',
                      },
                    },
                    flips: {
                      on: {
                        ANSWER: {
                          actions: [
                            assign({
                              longFlips: ({longFlips}, {hash, option}) =>
                                mergeFlipsByHash(longFlips, [{hash, option}]),
                            }),
                            log(
                              (_, {hash, option}) =>
                                `Make answer, hash: ${hash}, option: ${option}`
                            ),
                          ],
                        },
                        FINISH_FLIPS: {
                          target: 'finishFlips',
                          actions: log('Start checking keywords'),
                        },
                      },
                    },
                    finishFlips: {
                      on: {
                        START_KEYWORDS_QUALIFICATION: {
                          target: 'keywordsQualification',
                        },
                      },
                    },
                    keywordsQualification: {
                      type: 'parallel',
                      states: {
                        fetch: {
                          initial: 'fetching',
                          states: {
                            fetching: {
                              invoke: {
                                src: 'fetchWords',
                                onDone: {
                                  target: 'check',
                                  actions: assign({
                                    longFlips: ({longFlips}, {data}) =>
                                      mergeFlipsByHash(
                                        longFlips,
                                        data.map(({hash, words = []}) => ({
                                          hash,
                                          words: words.map(id => ({
                                            id,
                                            ...keywords[id],
                                          })),
                                        }))
                                      ),
                                  }),
                                },
                                onError: {
                                  target: 'check',
                                },
                              },
                            },
                            check: {
                              after: {
                                10000: [
                                  {
                                    target: 'fetching',
                                    cond: ({longFlips}) =>
                                      longFlips.length === 0 ||
                                      longFlips.some(decodedWithoutKeywords),
                                  },
                                  {
                                    target: 'done',
                                  },
                                ],
                              },
                            },
                            done: {
                              type: 'final',
                            },
                          },
                        },
                        check: {
                          invoke: {
                            src: () => cb => cb({type: 'PICK', index: 0}),
                          },
                          on: {
                            ANSWER: {
                              actions: [
                                assign({
                                  longFlips: ({longFlips}, {hash, option}) =>
                                    mergeFlipsByHash(longFlips, [
                                      {hash, option},
                                    ]),
                                }),
                                log(
                                  (_, {hash, option}) =>
                                    `Make answer, hash: ${hash}, option: ${option}`
                                ),
                              ],
                            },
                            TOGGLE_WORDS: {
                              actions: ['toggleKeywords'],
                            },
                            SUBMIT: {
                              target:
                                '#validation.longSession.solve.answer.review',
                            },
                            PICK_INDEX: {
                              actions: [
                                send((_, {index}) => ({
                                  type: 'PICK',
                                  index,
                                })),
                              ],
                            },
                          },
                        },
                      },
                    },
                    review: {
                      on: {
                        CHECK_FLIPS: {
                          target: 'keywordsQualification.check',
                          actions: [
                            send((_, {index}) => ({
                              type: 'PICK_INDEX',
                              index,
                            })),
                          ],
                        },
                        CHECK_REPORTS: 'keywordsQualification.check',
                        SUBMIT: 'submitAnswers',
                        CANCEL: {
                          target: 'keywordsQualification.check',
                          actions: [
                            send(({currentIndex}) => ({
                              type: 'PICK_INDEX',
                              index: currentIndex,
                            })),
                          ],
                        },
                      },
                    },
                    submitAnswers: {
                      initial: 'requestWordsSeed',
                      entry: log('Submit long answers'),
                      states: {
                        requestWordsSeed: {
                          invoke: {
                            src: () => fetchWordsSeed(),
                            onDone: {
                              target: 'submitLongAnswers',
                              actions: assign({
                                wordsSeed: (_, {data}) => hexToUint8Array(data),
                              }),
                            },
                            onError: {
                              target: 'fail',
                              actions: [
                                assign({
                                  errorMessage: (_, {data}) => data,
                                }),
                                log(),
                              ],
                            },
                          },
                        },
                        submitLongAnswers: {
                          invoke: {
                            // eslint-disable-next-line no-shadow
                            src: ({
                              longHashes,
                              longFlips,
                              wordsSeed,
                              longAnswersSubmitted,
                            }) =>
                              longAnswersSubmitted
                                ? Promise.resolve()
                                : submitLongAnswersTx(
                                    privateKey,
                                    longHashes,
                                    longFlips.map(
                                      ({
                                        option: answer = 0,
                                        hash,
                                        relevance,
                                      }) => ({
                                        answer,
                                        hash,
                                        wrongWords:
                                          relevance ===
                                          // eslint-disable-next-line no-use-before-define
                                          RelevanceType.Irrelevant,
                                      })
                                    ),
                                    wordsSeed,
                                    epoch
                                  ),
                            onDone: {
                              actions: [
                                assign({
                                  longAnswersSubmitted: true,
                                }),
                                log('Long answers sent'),
                                send('FORCE_SUBMIT_SHORT_ANSWERS'),
                              ],
                            },
                            onError: {
                              target: 'fail',
                              actions: [
                                assign({
                                  errorMessage: (_, {data}) => data,
                                }),
                                log(),
                              ],
                            },
                          },
                        },
                        fail: {
                          on: {
                            RETRY_SUBMIT: {
                              target: 'requestWordsSeed',
                            },
                          },
                        },
                      },
                    },
                    after: {
                      LONG_SESSION_CHECK: [
                        {
                          target: '#validation.validationFailed',
                          cond: ({longFlips}) => {
                            const solvableFlips = filterSolvableFlips(longFlips)
                            const answers = solvableFlips.filter(
                              ({option}) => option
                            )
                            return (
                              !solvableFlips.length ||
                              (solvableFlips.length &&
                                answers.length < solvableFlips.length / 2)
                            )
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
            sendShortAnswers: {
              entry: log('Start waiting long session to submit short answers'),
              initial: 'idle',
              states: {
                idle: {},
                send: {
                  initial: 'requestWordsSeed',
                  entry: log('Submit public short answers'),
                  states: {
                    requestWordsSeed: {
                      invoke: {
                        src: () => fetchWordsSeed(),
                        onDone: {
                          target: 'submitShortAnswers',
                          actions: assign({
                            wordsSeed: (_, {data}) => hexToUint8Array(data),
                          }),
                        },
                        onError: {
                          target: 'fail',
                          actions: [
                            assign({
                              errorMessage: (_, {data}) => data,
                            }),
                            log(),
                          ],
                        },
                      },
                    },
                    submitShortAnswers: {
                      invoke: {
                        // eslint-disable-next-line no-shadow
                        src: ({
                          shortHashes,
                          shortFlips,
                          wordsSeed,
                          shortAnswersSubmitted,
                        }) =>
                          shortAnswersSubmitted
                            ? Promise.resolve()
                            : submitShortAnswersTx(
                                privateKey,
                                shortHashes,
                                shortFlips.map(
                                  ({option: answer = 0, hash}) => ({
                                    answer,
                                    hash,
                                  })
                                ),
                                wordsSeed
                              ),
                        onDone: {
                          target: 'done',
                          actions: assign({
                            shortAnswersSubmitted: new Date().getTime(),
                          }),
                        },
                        onError: {
                          target: 'fail',
                          actions: [
                            assign({
                              errorMessage: (_, {data}) => data,
                            }),
                            log(),
                          ],
                        },
                      },
                    },
                    fail: {
                      after: {
                        1000: 'requestWordsSeed',
                      },
                    },
                    done: {
                      entry: log('Public short answers sent'),
                      always: [
                        {
                          cond: ({longAnswersSubmitted}) =>
                            longAnswersSubmitted,
                          target: '#validation.validationSucceeded',
                        },
                      ],
                    },
                  },
                },
              },
              after: {
                SEND_SHORT_ANSWERS: {
                  target: '.send',
                },
              },
            },
            exit: ['cleanupLongFlips'],
          },
          on: {
            FORCE_SUBMIT_SHORT_ANSWERS: {
              target: '.sendShortAnswers.send',
            },
          },
        },

        validationFailed: {
          type: 'final',
          entry: log('VALIDATION FAILED'),
        },
        validationSucceeded: {
          type: 'final',
          entry: ['onValidationSucceeded', log('VALIDATION SUCCEEDED')],
        },
      },
    },
    {
      services: {
        fetchIdentity: () => fetchIdentity(coinbase),
        fetchShortHashes: () => fetchFlipHashes(coinbase, SessionType.Short),
        fetchShortFlips: ({shortFlips}) => cb =>
          fetchFlips(
            coinbase,
            privateKey,
            shortFlips
              .filter(({missing, fetched}) => !fetched && !missing)
              .map(({hash}) => hash),
            cb
          ),
        fetchLongHashes: () => fetchFlipHashes(coinbase, SessionType.Long),
        fetchLongFlips: ({longFlips}) => cb =>
          fetchFlips(
            coinbase,
            privateKey,
            longFlips
              .filter(({missing, fetched}) => !fetched && !missing)
              .map(({hash}) => hash),
            cb
          ),
        // eslint-disable-next-line no-shadow
        fetchTranslations: ({longFlips, currentIndex, locale}) =>
          fetchConfirmedKeywordTranslations(
            longFlips[currentIndex].words.map(({id}) => id),
            locale
          ),
        sendPublicFlipKey: ({publicKeySent}) =>
          publicKeySent
            ? Promise.resolve()
            : sendPublicFlipKey(epoch, privateKey),
        fetchWords: ({longFlips}) =>
          loadWords(
            longFlips.filter(decodedWithoutKeywords).map(({hash}) => hash)
          ),
      },
      delays: {
        // eslint-disable-next-line no-shadow
        BUMP_EXTRA_FLIPS: ({validationStart}) =>
          Math.max(adjustDuration(validationStart, 35), 5) * 1000,
        // eslint-disable-next-line no-shadow
        FINALIZE_FLIPS: ({validationStart}) =>
          Math.max(adjustDuration(validationStart, 90), 5) * 1000,
        // eslint-disable-next-line no-shadow
        SHORT_SESSION_AUTO_SUBMIT: ({validationStart, shortSessionDuration}) =>
          adjustDuration(validationStart, shortSessionDuration - 10) * 1000,
        // eslint-disable-next-line no-shadow
        LONG_SESSION_CHECK: ({validationStart, longSessionDuration}) =>
          adjustDuration(
            validationStart,
            shortSessionDuration - 10 + longSessionDuration
          ) * 1000,
        // eslint-disable-next-line no-shadow
        SEND_SHORT_ANSWERS: ({validationStart, shortSessionDuration}) =>
          Math.max(adjustDuration(validationStart, shortSessionDuration), 5) *
          1000,
      },
      actions: {
        toggleKeywords: choose([
          {
            cond: ({longFlips}, {hash, relevance}) =>
              // eslint-disable-next-line no-use-before-define
              relevance === RelevanceType.Relevant &&
              !longFlips.find(x => x.hash === hash)?.relevance,
            actions: [
              assign({
                longFlips: ({longFlips}, {hash, relevance}) =>
                  mergeFlipsByHash(longFlips, [{hash, relevance}]),
              }),
            ],
          },
          {
            cond: ({longFlips}, {hash, relevance}) =>
              // eslint-disable-next-line no-use-before-define
              relevance === RelevanceType.Relevant &&
              longFlips.find(x => x.hash === hash)?.relevance ===
                // eslint-disable-next-line no-use-before-define
                RelevanceType.Irrelevant,
            actions: [
              assign({
                longFlips: ({longFlips}, {hash, relevance}) =>
                  mergeFlipsByHash(longFlips, [{hash, relevance}]),
                reportedFlipsCount: ({reportedFlipsCount}) =>
                  reportedFlipsCount - 1,
              }),
            ],
          },
          {
            cond: ({longFlips, reportedFlipsCount}, {relevance}) =>
              // eslint-disable-next-line no-use-before-define
              relevance === RelevanceType.Irrelevant &&
              reportedFlipsCount < availableReportsNumber(longFlips),
            actions: [
              assign({
                longFlips: ({longFlips}, {hash, relevance}) =>
                  mergeFlipsByHash(longFlips, [{hash, relevance}]),
                reportedFlipsCount: ({longFlips, reportedFlipsCount}, {hash}) =>
                  longFlips.find(x => x.hash === hash)?.relevance ===
                  // eslint-disable-next-line no-use-before-define
                  RelevanceType.Irrelevant
                    ? reportedFlipsCount
                    : reportedFlipsCount + 1,
              }),
            ],
          },
          {
            cond: ({longFlips, reportedFlipsCount}, {relevance}) =>
              // eslint-disable-next-line no-use-before-define
              relevance === RelevanceType.Irrelevant &&
              reportedFlipsCount >= availableReportsNumber(longFlips),
            actions: ['onExceededReports', log()],
          },
        ]),
        cleanupShortFlips: ({shortFlips}) => {
          filterSolvableFlips(shortFlips).forEach(({images}) =>
            images.forEach(URL.revokeObjectURL)
          )
        },
        cleanupLongFlips: ({longFlips}) => {
          filterSolvableFlips(longFlips).forEach(({images}) =>
            images.forEach(URL.revokeObjectURL)
          )
        },
        applyTranslations: assign({
          translations: ({translations, longFlips, currentIndex}, {data}) =>
            data.reduce((acc, curr, wordIdx) => {
              const currentFlip = longFlips[currentIndex]
              if (currentFlip && currentFlip.words) {
                const {words} = currentFlip
                const word = words[wordIdx]
                return word
                  ? {
                      ...acc,
                      [word.id]: curr,
                    }
                  : acc
              }
              return translations
            }, translations),
        }),
      },
      guards: {
        didFetchShortFlips: ({shortFlips}) => {
          const regularFlips = filterRegularFlips(shortFlips)
          return (
            regularFlips.some(x => x) &&
            regularFlips.every(({missing, decoded}) => decoded || missing)
          )
        },
        shouldTranslate: ({translations, longFlips, currentIndex}) =>
          shouldTranslate(translations, longFlips[currentIndex]),
      },
    }
  )

async function loadWords(hashes) {
  const res = []
  await forEachAsync(hashes, async hash =>
    fetchWords(hash)
      .then(({result}) => res.push({hash, ...result}))
      .catch()
  )
  return res
}

function fetchFlips(addr, privateKey, hashes, cb) {
  return forEachAsync(hashes, async hash => {
    const flip = await getRawFlip(hash, true)
    if (!flip) {
      return Promise.resolve(
        cb({
          type: 'FLIP',
          flip: {
            hash,
            missing: true,
          },
        })
      )
    }
    return fetchFlipKeys(addr, hash)
      .then(({result, error}) => {
        const dec = error ? {} : decodeFlip(privateKey, flip, {hash, ...result})
        return cb({
          type: 'FLIP',
          flip: {
            ...dec,
            hash,
            fetched: !!result && !error,
          },
        })
      })
      .catch(() => {
        console.debug(`Catch flip_get reject`, hash)
        cb({
          type: 'FLIP',
          flip: {
            hash,
            fetched: false,
          },
        })
      })
  })
}

function fetchRawFlips(hashes, cb, delay = 1000) {
  console.log(`Calling flip_get rpc for hashes`, hashes)
  return forEachAsync(hashes, hash =>
    getRawFlip(hash, true)
      .then(flip => {
        console.log(`Get flip_get response`, hash)
        cb({
          type: 'FLIP',
          flip: {
            ...flip,
            hash,
            fetched: !!flip,
            missing: !flip,
          },
        })
      })
      .then(() => wait(delay))
      .catch(() => {
        console.log(`Catch flip_get reject`, hash)
        cb({
          type: 'FLIP',
          flip: {
            hash,
            fetched: false,
          },
        })
      })
  )
}

function decodeFlip(
  privateKey,
  flip,
  {hash, publicKey, privateKey: flipEncryptedPrivateKey}
) {
  if (!flip) {
    return null
  }

  try {
    const decryptedPublicPart = decryptMessage(publicKey, flip.publicHex)
    const decryptedPrivateKey = decryptMessage(
      privateKey,
      flipEncryptedPrivateKey
    )
    const decryptedPrivatePart = decryptMessage(
      decryptedPrivateKey,
      flip.privateHex
    )

    const [images] = decode(decryptedPublicPart)
    const [privateImages, orders] = decode(decryptedPrivatePart)
    const result = images.concat(privateImages)

    return {
      hash,
      decoded: true,
      time: dayjs(),
      images: result.map(buffer =>
        URL.createObjectURL(new Blob([buffer], {type: 'image/png'}))
      ),
      orders: orders.map(order => order.map(([idx = 0]) => idx)),
      hex: '',
    }
  } catch {
    return {
      hash,
      decoded: false,
    }
  }
}

const stepStates = {
  initial: 'unknown',
  states: {
    unknown: {
      on: {
        '': [
          {
            target: 'fetching',
            cond: 'shouldTranslate',
          },
          {target: 'idle'},
        ],
      },
    },
    idle: {},
    fetching: {
      invoke: {
        src: 'fetchTranslations',
        onDone: {
          target: 'idle',
          actions: ['applyTranslations'],
        },
        onError: {
          actions: [log()],
        },
      },
    },
  },
}

function mergeHashes(hashes, newHashes) {
  return [...hashes, ...newHashes.filter(x => !hashes.some(y => y === x))]
}

function mergeFlipsByHash(flips, anotherFlips) {
  return flips.map(flip => ({
    ...flip,
    ...anotherFlips.find(({hash}) => hash === flip.hash),
  }))
}

async function fetchWords(hash) {
  return (
    await apiClient().post('/', {
      method: 'flip_words',
      params: [hash],
      id: 1,
    })
  ).data
}

export const RelevanceType = {
  Relevant: 1,
  Irrelevant: 2,
}

export function adjustDuration(validationStart, duration) {
  return dayjs(validationStart)
    .add(duration, 's')
    .diff(dayjs(), 's')
}

function removeByHash(hashes, hash) {
  const idx = hashes.indexOf(hash)
  return [...hashes.slice(0, idx), ...hashes.slice(idx + 1)]
}

async function saveFlipToIndexedDb(epoch, flip) {
  try {
    await db.table('flips').add({
      hash: flip.hash,
      epoch,
      publicHex: flip.publicHex,
      privateHex: flip.privateHex,
      fromStorage: true,
    })
  } catch (e) {
    console.error('cannot save flip', e)
  }
}

async function getRawFlip(hash, withRemote = false) {
  let flip = null
  try {
    flip = await db.table('flips').get(hash)
  } catch (e) {
    console.error('cannot get flip from storage', hash, e)
  }
  if (flip || !withRemote) {
    return flip
  }
  const {result, error} = await fetchRawFlip(hash)
  if (error) {
    return null
  }
  return result
}

async function sendPublicFlipKey(epoch, privateKey) {
  const publicFlipKeyData = preparePublicFlipKey(privateKey, epoch)
  const result = await sendPublicEncryptionKey(
    toHexString(publicFlipKeyData.getKey(), true),
    toHexString(publicFlipKeyData.getSignature(), true),
    publicFlipKeyData.getEpoch()
  )
  console.log('public key sent', result)
}

async function sendKeysPackage(candidates, epoch, privateKey) {
  const packageData = prepareFlipKeysPackage(candidates, privateKey, epoch)
  const result = await sendPrivateEncryptionKeysPackage(
    toHexString(packageData.getData(), true),
    toHexString(packageData.getSignature(), true),
    packageData.getEpoch()
  )
  console.log('private keys sent', result)
}

async function submitShortAnswersHashTx(key, epoch, hashes, answers) {
  const hash = createShortAnswersHash(key, epoch, hashes, answers)
  const rawTx = await getRawTx(
    5,
    privateKeyToAddress(key),
    null,
    0,
    0,
    toHexString(hash, true)
  )

  const tx = new Transaction().fromHex(rawTx)
  tx.sign(key)

  const hex = tx.toHex()

  const result = await sendRawTx(`0x${hex}`)

  console.log('sending short answers hash tx', hex, result)
}

async function submitShortAnswersTx(key, hashes, answers, wordsSeed) {
  const [index] = Evaluate(key, wordsSeed)
  const data = serializeAnswers(hashes, answers)
  const rnd = new BN(index.slice(0, 8), null, 'le').toString()
  const attachment = new ShortAnswerAttachment(rnd, data).toBytes()

  const rawTx = await getRawTx(
    6,
    privateKeyToAddress(key),
    null,
    0,
    0,
    toHexString(attachment, true)
  )
  const tx = new Transaction().fromHex(rawTx)
  tx.sign(key)

  const hex = tx.toHex()

  const result = await sendRawTx(`0x${hex}`)

  console.log('sending short answers tx', hex, result)
}

async function submitLongAnswersTx(key, hashes, answers, wordsSeed, epoch) {
  const [, proof] = Evaluate(key, wordsSeed)
  const data = serializeAnswers(hashes, answers)
  const attachment = new LongAnswerAttachment(
    data,
    proof,
    generateFlipKey(true, epoch, key),
    generateShortAnswersSalt(epoch, key)
  ).toBytes()
  const rawTx = await getRawTx(
    7,
    privateKeyToAddress(key),
    null,
    0,
    0,
    toHexString(attachment, true)
  )

  const tx = new Transaction().fromHex(rawTx)
  tx.sign(key)

  const hex = tx.toHex()

  const result = await sendRawTx(`0x${hex}`)

  console.log('sending long answers tx', hex, result)
}
