/* eslint-disable react/prop-types */
import {useMachine} from '@xstate/react'
import React from 'react'
import {createMachine} from 'xstate'
import {assign, log} from 'xstate/lib/actions'
import {canValidate} from '../../screens/validation/utils'
import {OnboardingStep} from '../types'
import {shouldCreateFlips} from '../utils/onboarding'
import {loadPersistentState, persistState} from '../utils/persist'
import {useEpoch} from './epoch-context'
import {useIdentity} from './identity-context'

const OnboardingStateContext = React.createContext()
const OnboardingDispatchContext = React.createContext()

export function OnboardingProvider({children}) {
  const epoch = useEpoch()

  const [identity] = useIdentity()

  const createStep = (step, config) => ({
    [step]: {
      entry: ['setCurrentStep', 'setIdentity', log()],
      initial: 'unknown',
      states: {
        unknown: {
          always: [
            {target: 'dismissed', cond: 'didDismissStep'},
            {target: 'promoting', cond: 'shouldPromoteStep'},
          ],
          invoke: {
            src: 'restoreDismissedSteps',
            onDone: {actions: ['setDismissedSteps']},
            onError: 'promoting',
          },
        },
        promoting: {on: {SHOW: 'showing'}},
        showing: {on: {DISMISS: 'dismissed'}},
        dismissed: {
          entry: ['addDismissedStep', 'persistDismissedSteps'],
        },
      },
      ...config,
    },
  })

  const [current, send] = useMachine(
    createMachine(
      {
        context: {currentStep: null, dismissedSteps: null},
        initial: 'unknown',
        states: {
          unknown: {
            on: {
              [OnboardingStep.ActivateInvite]: OnboardingStep.ActivateInvite,
              [OnboardingStep.Validate]: OnboardingStep.Validate,
              [OnboardingStep.ActivateMining]: OnboardingStep.ActivateMining,
              [OnboardingStep.CreateFlips]: OnboardingStep.CreateFlips,
              UPDATE_IDENTITY: {actions: ['setIdentity']},
            },
          },
          ...createStep(OnboardingStep.ActivateInvite, {
            on: {[OnboardingStep.Validate]: OnboardingStep.Validate},
          }),
          ...createStep(OnboardingStep.Validate, {
            on: {
              [OnboardingStep.ActivateMining]: OnboardingStep.ActivateMining,
            },
          }),
          ...createStep(OnboardingStep.ActivateMining, {
            on: {
              NEXT: [
                {
                  target: OnboardingStep.CreateFlips,
                  // eslint-disable-next-line no-shadow
                  cond: ({identity}) => shouldCreateFlips(identity),
                },
                'done',
              ],
              [OnboardingStep.CreateFlips]: OnboardingStep.CreateFlips,
            },
            exit: ['addDismissedStep', 'persistDismissedSteps', log()],
          }),
          ...createStep(OnboardingStep.CreateFlips),
          done: {},
        },
      },
      {
        actions: {
          setCurrentStep: assign({currentStep: (_, {type}) => type}),
          setDismissedSteps: assign({
            dismissedSteps: (_, {data}) => new Set(data),
          }),
          addDismissedStep: assign({
            dismissedSteps: ({dismissedSteps, currentStep}) =>
              dismissedSteps.add(currentStep),
          }),
          persistDismissedSteps: ({dismissedSteps}) => {
            persistState('onboardingDismissedSteps', [...dismissedSteps])
          },
          setIdentity: assign({
            // eslint-disable-next-line no-shadow
            identity: (_, {identity}) => identity,
          }),
        },
        services: {
          restoreDismissedSteps: async () =>
            loadPersistentState('onboardingDismissedSteps'),
        },
        guards: {
          didDismissStep: ({dismissedSteps, currentStep}) =>
            dismissedSteps?.has(currentStep),
          shouldPromoteStep: ({dismissedSteps, currentStep}) =>
            Boolean(dismissedSteps) && !dismissedSteps.has(currentStep),
        },
      }
    )
  )

  React.useEffect(() => {
    if (epoch?.epoch >= 0 && identity) {
      send(
        (() => {
          switch (true) {
            case identity.canActivateInvite:
              return OnboardingStep.ActivateInvite
            case identity.age === 1 && !identity.online:
              return OnboardingStep.ActivateMining
            case shouldCreateFlips(identity):
              return OnboardingStep.CreateFlips
            case canValidate(identity):
              return OnboardingStep.Validate
            default:
              return 'UPDATE_IDENTITY'
          }
        })(),
        {identity}
      )
    }
  }, [epoch, identity, send])

  return (
    <OnboardingStateContext.Provider value={{current}}>
      <OnboardingDispatchContext.Provider
        value={{
          showCurrentTask() {
            send('SHOW')
          },
          dismissCurrentTask() {
            send('DISMISS')
          },
          // eslint-disable-next-line no-shadow
          next({identity}) {
            send('NEXT', {identity})
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
