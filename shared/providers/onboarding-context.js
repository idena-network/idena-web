import {useMachine} from '@xstate/react'
import React from 'react'
import {Machine} from 'xstate'
import {log} from 'xstate/lib/actions'
import {canValidate} from '../../screens/validation/utils'
import {OnboardingStep} from '../types'
import {wait} from '../utils/fn'
import {
  doneOnboardingStep,
  onboardingStep,
  shouldTransitionToCreateFlipsStep,
} from '../utils/onboarding'
import {useEpoch} from './epoch-context'
import {useIdentity} from './identity-context'

const OnboardingStateContext = React.createContext()
const OnboardingDispatchContext = React.createContext()

export function OnboardingProvider(props) {
  const {epoch} = useEpoch() ?? {epoch: -1}

  const [identity] = useIdentity()

  const onboardingStepSelector = step => `#onboarding.${onboardingStep(step)}`

  // eslint-disable-next-line no-shadow
  const createStep = ({current, next, on}) => ({
    [current]: {
      initial: 'active',
      states: {
        active: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                SHOW: 'showing',
              },
            },
            showing: {},
          },
          on: {
            DISMISS: 'dismissed',
          },
        },
        done: {
          initial: 'unknown',
          states: {
            unknown: {
              invoke: {
                src: () => cb => {
                  try {
                    cb({
                      type: 'DONE',
                      didSalut: localStorage.getItem(
                        doneOnboardingStep(current)
                      ),
                    })
                  } catch {
                    cb('ERROR')
                  }
                },
              },
              on: {
                DONE: [
                  {
                    target: 'done',
                    cond: (_, {didSalut}) => Boolean(didSalut),
                  },
                  {target: 'salut'},
                ],
                ERROR: 'fail',
              },
            },
            salut: {
              invoke: {
                src: () => cb => {
                  try {
                    localStorage.setItem(doneOnboardingStep(current), 1)
                    wait(300).then(() => cb('DONE'))
                  } catch {
                    cb('ERROR')
                  }
                },
              },
              on: {
                DONE: 'done',
                ERROR: 'fail',
              },
            },
            done: {
              after: {
                300: next,
              },
            },
            fail: {entry: [log()]},
          },
        },
        dismissed: {
          on: {
            SHOW: 'active.showing',
          },
        },
      },
      on: {
        DONE: '.done',
        NEXT: next,
        ...on,
      },
    },
  })

  const [current, send] = useMachine(
    Machine({
      id: 'onboarding',
      context: {
        currentStep: OnboardingStep.ActivateInvite,
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            START: [
              {
                target: onboardingStepSelector(OnboardingStep.ActivateInvite),
                cond: (_, {identity: {canActivateInvite}}) => canActivateInvite,
              },
              {
                target: onboardingStepSelector(OnboardingStep.Validate),
                // eslint-disable-next-line no-shadow
                cond: (_, {identity}) => canValidate(identity),
              },
              {
                target: onboardingStepSelector(OnboardingStep.ActivateMining),
                cond: (_, {identity: {age, online}}) => age === 1 && !online,
              },
              {
                target: onboardingStepSelector(OnboardingStep.CreateFlips),
                // eslint-disable-next-line no-shadow
                cond: (_, {identity}) =>
                  shouldTransitionToCreateFlipsStep(identity),
              },
            ],
          },
        },
        onboarding: {
          initial: 'unknown',
          states: {
            unknown: {},
            ...createStep({
              current: OnboardingStep.ActivateInvite,
              next: onboardingStepSelector(OnboardingStep.Validate),
            }),
            ...createStep({
              current: OnboardingStep.Validate,
              next: onboardingStepSelector(OnboardingStep.ActivateMining),
              on: {
                ROLLBACK: OnboardingStep.ActivateInvite,
              },
            }),
            ...createStep({
              current: OnboardingStep.ActivateMining,
              next: onboardingStepSelector(OnboardingStep.CreateFlips),
            }),
            ...createStep({
              current: OnboardingStep.CreateFlips,
              next: '#onboarding.done',
            }),
          },
          on: {
            FINISH: 'done',
          },
        },
        done: {},
      },
    }),
    {
      logger: global.isDev
        ? console.log
        : (...args) => global.logger.debug(...args),
    }
  )

  React.useEffect(() => {
    if (epoch >= 0 && identity) {
      send('START', {identity})
    }
  }, [epoch, identity, send])

  return (
    <OnboardingStateContext.Provider value={current}>
      <OnboardingDispatchContext.Provider
        value={{
          showCurrentTask() {
            send('SHOW')
          },
          dismiss() {
            send('DISMISS')
          },
          done: React.useCallback(() => {
            send('DONE')
          }, [send]),
          finish: React.useCallback(() => {
            send('FINISH')
          }, [send]),
          rollback: React.useCallback(() => {
            send('ROLLBACK')
          }, [send]),
        }}
        {...props}
      />
    </OnboardingStateContext.Provider>
  )
}

export function useOnboardingState() {
  const context = React.useContext(OnboardingStateContext)
  if (context === undefined) {
    throw new Error(
      'useOnboardingState must be used within a OnboardingProvider'
    )
  }
  return context
}

export function useOnboardingDispatch() {
  const context = React.useContext(OnboardingDispatchContext)
  if (context === undefined) {
    throw new Error(
      'useOnboardingDispatch must be used within a OnboardingDispatchContext'
    )
  }
  return context
}

export function useOnboarding() {
  return [useOnboardingState(), useOnboardingDispatch()]
}
