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

const initialContext = {
  storage: {epoch: 0, dontShow: false},
}

export const createRestrictedModalMachine = () =>
  Machine(
    {
      id: 'restrictedMachine',
      initial: 'idle',
      context: initialContext,
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
        NEW_API_KEY_STATE: {
          actions: assign({
            prevApiKeyState: ({apiKeyState}) => apiKeyState,
            apiKeyState: (_, {apiKeyState}) => apiKeyState,
          }),
        },
        NEW_EPOCH: [
          {
            cond: ({storage}, {epoch}) => !storage || storage.epoch !== epoch,
            actions: [
              assign({
                epoch: (_, {epoch}) => epoch,
                storage: (_, {epoch}) => ({epoch, dontShow: false}),
              }),
              'persistModalState',
            ],
          },
          {
            actions: assign({
              epoch: (_, {epoch}) => epoch,
            }),
          },
        ],
        RESTART: {
          target: '#restrictedMachine.running',
          actions: assign({
            type: RestrictedTypes.Immediately,
            identityState: (_, {identityState}) => identityState,
          }),
        },
        CLEAR: {
          actions: assign(() => initialContext),
        },
      },
    },
    {
      delays: {
        CHECK_INTERVAL: () =>
          isVercelProduction ? 15 * 60 * 1000 : 3 * 60 * 1000,
      },
      guards: {
        neetToRedirect: ({
          type,
          identityState,
          epoch,
          storage,
          pathname,
          prevApiKeyState,
          apiKeyState,
        }) => {
          if (!identityState) {
            return false
          }

          if (apiKeyState !== apiKeyStates.RESTRICTED) {
            return false
          }

          if (
            [
              '/node/restricted',
              '/validation',
              '/try/validation',
              '/flips/new',
              '/flips/edit',
            ].includes(pathname)
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
