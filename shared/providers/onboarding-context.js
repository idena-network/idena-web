/* eslint-disable react/prop-types */
import {useMachine} from '@xstate/react'
import React from 'react'
import {createMachine} from 'xstate'
import {assign} from 'xstate/lib/actions'
import {canValidate} from '../../screens/validation/utils'
import {OnboardingStep} from '../types'
import {promotingOnboardingStep, shouldCreateFlips} from '../utils/onboarding'
import {useEpoch} from './epoch-context'
import {useIdentity} from './identity-context'

const OnboardingStateContext = React.createContext()
const OnboardingDispatchContext = React.createContext()

export function OnboardingProvider({children}) {
  const epoch = useEpoch()

  const [identity] = useIdentity()

  const createStep = (step, config) => ({
    [step]: {
      initial: 'unknown',
      states: {
        unknown: {
          invoke: {
            src: () => Promise.resolve(localStorage.getItem('onboardingStep')),
            onDone: [
              {
                target: 'dismissed',
                cond: (_, {data}) => data === `${step}.dismissed`,
              },
              {target: 'promoting'},
            ],
            onError: 'promoting',
          },
        },
        promoting: {
          entry: [assign({currentStep: promotingOnboardingStep(step)})],
          on: {
            SHOW: 'showing',
          },
        },
        showing: {
          entry: [assign({currentStep: `${step}.showing`})],
          on: {
            DISMISS: 'dismissed',
          },
        },
        dismissed: {
          entry: [
            assign({currentStep: `${step}.dismissed`}),
            'persistCurrentStep',
          ],
        },
      },
      ...config,
    },
  })

  const [current, send] = useMachine(
    createMachine(
      {
        context: {currentStep: null},
        initial: 'unknown',
        states: {
          unknown: {
            on: {
              ACTIVATE_INVITE: OnboardingStep.ActivateInvite,
              VALIDATE: OnboardingStep.Validate,
              ACTIVATE_MINING: {
                target: OnboardingStep.ActivateMining,
                actions: ['setIdentity'],
              },
              CREATE_FLIPS: OnboardingStep.CreateFlips,
            },
          },
          ...createStep(OnboardingStep.ActivateInvite, {
            on: {
              VALIDATE: OnboardingStep.Validate,
            },
          }),
          ...createStep(OnboardingStep.Validate, {
            on: {
              ACTIVATE_MINING: {
                target: OnboardingStep.ActivateMining,
                actions: ['setIdentity'],
              },
            },
          }),
          ...createStep(OnboardingStep.ActivateMining, {
            on: {
              DONE: [
                {
                  target: OnboardingStep.CreateFlips,
                  // eslint-disable-next-line no-shadow
                  cond: ({identity}) => shouldCreateFlips(identity),
                },
                {target: 'done'},
              ],
              CREATE_FLIPS: OnboardingStep.CreateFlips,
            },
          }),
          ...createStep(OnboardingStep.CreateFlips, {
            on: {
              DONE: 'done',
            },
          }),
          done: {},
        },
      },
      {
        actions: {
          setIdentity: assign({
            // eslint-disable-next-line no-shadow
            identity: (_, {identity}) => identity,
          }),
          persistCurrentStep: ({currentStep}) =>
            localStorage.setItem('onboardingStep', currentStep),
        },
      }
    )
  )

  React.useEffect(() => {
    if (epoch?.epoch >= 0 && identity) {
      switch (true) {
        case identity.canActivateInvite:
          send('ACTIVATE_INVITE')
          break
        case identity.age === 1 && !identity.online:
          send('ACTIVATE_MINING', {identity})
          break
        case shouldCreateFlips(identity):
          send('CREATE_FLIPS')
          break
        case canValidate(identity):
          send('VALIDATE')
          break

        default:
          break
      }
    }
  }, [epoch, identity, send])

  return (
    <OnboardingStateContext.Provider
      value={{currentStep: current.context.currentStep, current}}
    >
      <OnboardingDispatchContext.Provider
        value={{
          showCurrentTask() {
            send('SHOW')
          },
          dismissCurrentTask() {
            send('DISMISS')
          },
          doneCurrentTask() {
            send('DONE')
          },
        }}
      >
        {children}
      </OnboardingDispatchContext.Provider>
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
