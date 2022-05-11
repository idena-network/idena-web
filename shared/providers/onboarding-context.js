/* eslint-disable react/prop-types */
import {useMachine} from '@xstate/react'
import React, {useMemo} from 'react'
import {createMachine} from 'xstate'
import {assign, choose} from 'xstate/lib/actions'
import {canValidate, hasValidationResults} from '../../screens/validation/utils'
import {IdentityStatus, OnboardingStep} from '../types'
import {rewardWithConfetti, shouldCreateFlips} from '../utils/onboarding'
import {loadPersistentState, persistState} from '../utils/persist'
import {useEpoch} from './epoch-context'
import {useIdentity} from './identity-context'
import {useTestValidationState} from './test-validation-context'

const OnboardingContext = React.createContext()

export function OnboardingProvider({children}) {
  const epoch = useEpoch()

  const [identity] = useIdentity()
  const {hasSuccessTrainingValidation} = useTestValidationState()

  const createStep = (step, config) => ({
    [step]: {
      entry: ['setCurrentStep', 'setIdentity'],
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

  const machine = useMemo(
    () =>
      createMachine(
        {
          context: {currentStep: null, dismissedSteps: null},
          initial: 'unknown',
          states: {
            unknown: {
              on: {
                [OnboardingStep.StartTraining]: OnboardingStep.StartTraining,
                [OnboardingStep.ActivateInvite]: OnboardingStep.ActivateInvite,
                [OnboardingStep.Validate]: OnboardingStep.Validate,
                [OnboardingStep.ActivateMining]: OnboardingStep.ActivateMining,
                [OnboardingStep.CreateFlips]: OnboardingStep.CreateFlips,
                UPDATE_IDENTITY: {actions: ['setIdentity']},
              },
            },
            ...createStep(OnboardingStep.StartTraining, {
              on: {
                [OnboardingStep.ActivateInvite]: OnboardingStep.ActivateInvite,
                [OnboardingStep.Validate]: {
                  actions: 'reward',
                  target: OnboardingStep.Validate,
                },
                SHOW: '.showing',
              },
            }),
            ...createStep(OnboardingStep.ActivateInvite, {
              on: {
                [OnboardingStep.Validate]: OnboardingStep.Validate,
                SHOW: '.showing',
              },
              exit: ['reward'],
            }),
            ...createStep(OnboardingStep.Validate, {
              on: {
                [OnboardingStep.ActivateMining]: OnboardingStep.ActivateMining,
                SHOW: '.showing',
              },
            }),
            ...createStep(OnboardingStep.ActivateInvite, {
              on: {
                [OnboardingStep.Validate]: OnboardingStep.Validate,
                SHOW: '.showing',
              },
              exit: ['reward'],
            }),
            ...createStep(OnboardingStep.Validate, {
              on: {
                [OnboardingStep.ActivateMining]: OnboardingStep.ActivateMining,
                SHOW: '.showing',
              },
              exit: [
                choose([
                  {
                    actions: 'reward',
                    // eslint-disable-next-line no-shadow
                    cond: ({identity}) =>
                      identity.isValidated &&
                      identity.state === IdentityStatus.Newbie,
                  },
                ]),
              ],
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
                SHOW: '.showing',
                [OnboardingStep.CreateFlips]: OnboardingStep.CreateFlips,
              },
              exit: ['addDismissedStep', 'persistDismissedSteps'],
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
            reward: () => rewardWithConfetti(),
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
      ),
    []
  )

  const [current, send] = useMachine(machine)

  React.useEffect(() => {
    if (epoch?.epoch >= 0 && identity?.state) {
      send(
        (() => {
          switch (true) {
            case identity.state === IdentityStatus.Undefined &&
              !hasSuccessTrainingValidation &&
              !hasValidationResults():
              return OnboardingStep.StartTraining
            case identity.canActivateInvite:
              return OnboardingStep.ActivateInvite
            case identity.age === 1 &&
              !(identity.online || Boolean(identity.delegatee)):
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
  }, [epoch, hasSuccessTrainingValidation, identity, send])

  return (
    <OnboardingContext.Provider
      value={[
        current,
        {
          showCurrentTask() {
            send('SHOW')
          },
          dismissCurrentTask() {
            send('DISMISS')
          },
          next() {
            send('NEXT')
          },
        },
      ]}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = React.useContext(OnboardingContext)
  if (context === undefined)
    throw new Error('useOnboarding must be used within a OnboardingProvider')
  return context
}
