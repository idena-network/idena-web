import {useMachine} from '@xstate/react'
import {assign, createMachine} from 'xstate'

export function useTimer(initialDuration) {
  // eslint-disable-next-line no-use-before-define
  const [state, send] = useMachine(timerMachine, {
    context: {
      duration: initialDuration,
    },
  })

  const isStopped = state.matches('stopped')
  const isRunning = state.matches('running')

  const {elapsed} = state.context
  const remaining = initialDuration - elapsed

  return [
    {
      elapsed,
      remaining,
      remainingSeconds: Math.floor(remaining / 1000),
      isRunning,
      isStopped,
      status: state.value,
    },
    {
      reset(duration) {
        send('RESET', {duration})
      },
      stop() {
        send('STOP')
      },
    },
  ]
}

const timerMachine = createMachine({
  context: {
    interval: 1000,
    duration: 0,
    elapsed: 0,
  },
  initial: 'running',
  states: {
    running: {
      always: [
        {
          target: 'stopped',
          cond: ({elapsed, duration}) => elapsed >= duration || duration < 0,
        },
      ],
      invoke: {
        src: ({interval}) => cb => {
          const intervalId = setInterval(() => {
            cb('TICK')
          }, interval)

          return () => clearInterval(intervalId)
        },
      },
      on: {
        TICK: {
          actions: [
            assign({elapsed: ({elapsed, interval}) => elapsed + interval}),
          ],
        },
      },
    },
    stopped: {
      always: {
        target: 'running',
        cond: ({elapsed, duration}) => elapsed < duration,
      },
    },
  },
  on: {
    RESET: {
      actions: [
        assign({
          duration: (_, {duration}) => duration,
          elapsed: 0,
        }),
      ],
    },
    STOP: {
      actions: assign({elapsed: 0}),
    },
  },
})
