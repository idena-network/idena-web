import {Machine, assign} from 'xstate'
import dayjs from 'dayjs'
import {log} from 'xstate/lib/actions'
import {IdentityStatus} from './types'
import {isVercelProduction} from './utils/utils'
import {apiKeyStates} from './providers/settings-context'

export const createTimerMachine = duration =>
  Machine({
    initial: 'running',
    context: {
      elapsed: 0,
      duration,
      interval: 1,
    },
    states: {
      running: {
        entry: assign({
          start: dayjs(),
        }),
        invoke: {
          src: ({interval}) => cb => {
            const intervalId = setInterval(() => cb('TICK'), 1000 * interval)
            return () => clearInterval(intervalId)
          },
        },
        on: {
          '': {
            target: 'stopped',
            // eslint-disable-next-line no-shadow
            cond: ({elapsed, duration}) => elapsed >= duration,
          },
          TICK: {
            actions: assign({
              elapsed: ({start}) => dayjs().diff(start, 's'),
            }),
          },
        },
      },
      stopped: {
        on: {
          '': {
            target: 'running',
            // eslint-disable-next-line no-shadow
            cond: ({elapsed, duration}) => elapsed < duration,
          },
        },
      },
    },
    on: {
      DURATION_UPDATE: {
        actions: assign({
          // eslint-disable-next-line no-shadow
          duration: (_, {duration}) => duration,
        }),
      },
      RESET: {
        actions: assign({
          elapsed: 0,
        }),
      },
    },
  })

const RestrictedTypes = {
  Immediately: 0,
  Timer: 1,
}

export const createRestrictedModalMachine = () =>
  Machine(
    {
      id: 'restrictedMachine',
      initial: 'idle',
      context: {
        storage: {epoch: 0, dontShow: false},
      },
      states: {
        idle: {},
        running: {
          entry: log(),
          initial: 'loadData',
          states: {
            loadData: {
              entry: log('get data'),
              invoke: {
                src: 'getExternalData',
              },
              on: {
                DATA: {
                  actions: [
                    assign({
                      pathname: (_, {data}) => data.pathname,
                      storage: ({storage}, {data}) => data.storage || storage,
                    }),
                    log(),
                  ],
                  target: 'check',
                },
              },
            },
            check: {
              always: [
                {
                  actions: 'onRedirect',
                  cond: 'neetToRedirect',
                  target: 'idle',
                },
                {target: 'idle'},
              ],
            },
            idle: {},
          },
        },
      },
      after: {
        CHECK_INTERVAL: {
          actions: assign({
            type: RestrictedTypes.Timer,
          }),
          target: 'running',
        },
      },
      on: {
        NEW_EPOCH: [
          {
            cond: ({storage}, {epoch}) => !storage || storage.epoch !== epoch,
            actions: [
              assign((_, {epoch}) => ({
                epoch,
                storage: {epoch, dontShow: false},
              })),
              'persistModalState',
            ],
          },
        ],
        RESTART: {
          target: '#restrictedMachine.running',
          actions: assign({
            type: RestrictedTypes.Immediately,
            identityState: (_, {identityState}) => identityState,
            currentEpoch: (_, {epoch}) => epoch,
            prevApiKeyState: ({apiKeyState}) => apiKeyState,
            apiKeyState: (_, {apiKeyState}) => apiKeyState,
          }),
        },
      },
    },
    {
      delays: {
        CHECK_INTERVAL: () =>
          isVercelProduction ? 15 * 60 * 1000 : 1 * 60 * 1000,
      },
      guards: {
        needToRedirectImmediately: () => {
          console.log('need to redirect now')
          return false
        },
        neetToRedirect: ({
          type,
          identityState,
          epoch,
          storage,
          pathname,
          prevApiKeyState,
          apiKeyState,
        }) => {
          if (apiKeyState !== apiKeyStates.RESTRICTED) {
            return false
          }

          if (
            ['/node/restricted', '/validation', '/try/validation'].includes(
              pathname
            )
          ) {
            return false
          }

          // we set dont show checkbox
          if (storage.epoch === epoch && storage.dontShow) {
            return false
          }

          if (
            [IdentityStatus.Undefined, IdentityStatus.Invite].includes(
              identityState
            )
          ) {
            return false
          }

          if (
            type === RestrictedTypes.Immediately &&
            prevApiKeyState === apiKeyStates.OFFLINE
          ) {
            return false
          }

          return true
        },
      },
    }
  )
