/* eslint-disable no-unused-expressions */
/* eslint-disable no-use-before-define */
import {Button, useToast} from '@chakra-ui/react'
import {useMachine} from '@xstate/react'
import {useRouter} from 'next/router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {createMachine} from 'xstate'
import {assign, choose} from 'xstate/lib/actions'
import {useEpoch} from '../../../shared/providers/epoch-context'
import {useTestValidationState} from '../../../shared/providers/test-validation-context'
import {EpochPeriod} from '../../../shared/types'
import {ValidatonStatusToast} from '../components/status-toast'

export function useValidationStatusToast() {
  const {t} = useTranslation()

  const router = useRouter()

  const toast = useToast()

  const closeValidationToasts = useCloseValidationStatusToast()

  useTrackEpochPeriod({
    onChangeCurrentPeriod: currentPeriod => {
      for (const period of [
        EpochPeriod.FlipLottery,
        EpochPeriod.ShortSession,
        EpochPeriod.LongSession,
        EpochPeriod.AfterLongSession,
      ]) {
        if (period !== currentPeriod && toast.isActive(period)) {
          toast.close(period)
        }
      }
    },
    onFlipLottery: () => {
      if (toast.isActive(EpochPeriod.FlipLottery)) return

      toast({
        id: EpochPeriod.FlipLottery,
        duration: null,
        render: () => (
          <ValidatonStatusToast
            title={t('Idena validation will start soon')}
            colorScheme="red"
          >
            <Button
              variant="unstyled"
              onClick={() => {
                router.push('/validation/lottery')
              }}
            >
              {t('Show countdown')}
            </Button>
          </ValidatonStatusToast>
        ),
      })
    },
    onValidationCeremony: () => {
      if (toast.isActive('validationCeremony')) return

      toast({
        id: 'validationCeremony',
        duration: null,
        render: () => (
          <ValidatonStatusToast
            title={t('Waiting for the end of the long session')}
            colorScheme="green"
          >
            <Button
              variant="unstyled"
              onClick={() => {
                router.push('/validation/after')
              }}
            >
              {t('Show countdown')}
            </Button>
          </ValidatonStatusToast>
        ),
      })
    },
    onAfterLongSession: () => {
      if (toast.isActive(EpochPeriod.AfterLongSession)) return

      toast({
        id: EpochPeriod.AfterLongSession,
        duration: null,
        render: () => (
          <ValidatonStatusToast
            title={t('Waiting for the Idena validation results')}
            colorScheme="green"
          >
            <Button
              variant="unstyled"
              onClick={() => {
                router.push('/validation/after')
              }}
            >
              {t('Show status')}
            </Button>
          </ValidatonStatusToast>
        ),
      })
    },
    onNone: closeValidationToasts,
  })
}

export function useTestValidationStatusToast() {
  const {t} = useTranslation()

  const router = useRouter()

  const toast = useToast()

  const {
    current: currentTrainingValidation,
    epoch: testValidationEpoch,
  } = useTestValidationState()

  const closeToast = React.useCallback(
    id => {
      if (toast.isActive(id)) {
        toast.close(id)
      }
    },
    [toast]
  )

  React.useEffect(() => {
    if (currentTrainingValidation) {
      const isTrainingValidationSoon =
        testValidationEpoch?.currentPeriod !== EpochPeriod.FlipLottery

      if (isTrainingValidationSoon) {
        closeToast('testValidationRunning')
      } else {
        closeToast('testValidationSoon')
      }

      toast({
        id: isTrainingValidationSoon
          ? 'testValidationSoon'
          : 'testValidationRunning',
        duration: null,
        render: () => (
          <ValidatonStatusToast
            title={
              isTrainingValidationSoon
                ? t('Idena training validation will start soon')
                : t('Idena training validation is in progress')
            }
            colorScheme={isTrainingValidationSoon ? 'red' : 'green'}
          >
            <Button
              variant="unstyled"
              onClick={() => {
                router.push(
                  isTrainingValidationSoon
                    ? '/try/validation/lottery'
                    : '/try/validation/after'
                )
              }}
            >
              {t('Show countdown')}
            </Button>
          </ValidatonStatusToast>
        ),
      })
    }
  }, [
    closeToast,
    currentTrainingValidation,
    router,
    t,
    testValidationEpoch,
    toast,
  ])
}

export function useTrackEpochPeriod({
  onNone,
  onFlipLottery,
  onShortSession,
  onLongSession,
  onAfterLongSession,
  onChangeCurrentPeriod,
  onValidation,
  onValidationCeremony,
}) {
  const epoch = useEpoch()
  const currentPeriod = epoch?.currentPeriod

  const [, send] = useMachine(trackEpochPeriodMachine, {
    actions: {
      // eslint-disable-next-line no-shadow
      onChangeCurrentPeriod: ({currentPeriod}) => {
        onChangeCurrentPeriod?.(currentPeriod)

        const isValidation = [
          EpochPeriod.FlipLottery,
          EpochPeriod.ShortSession,
          EpochPeriod.LongSession,
          EpochPeriod.AfterLongSession,
        ].includes(currentPeriod)

        if (isValidation) {
          onValidation?.(currentPeriod)
        }

        const isValidationCeremony = [
          EpochPeriod.ShortSession,
          EpochPeriod.LongSession,
        ].includes(currentPeriod)

        if (isValidationCeremony) {
          onValidationCeremony?.()
        }

        switch (currentPeriod) {
          case EpochPeriod.None:
            onNone?.()
            break
          case EpochPeriod.FlipLottery:
            onFlipLottery?.()
            break
          case EpochPeriod.ShortSession:
            onShortSession?.()
            break
          case EpochPeriod.LongSession:
            onLongSession?.()
            break
          case EpochPeriod.AfterLongSession:
            onAfterLongSession?.()
            break

          default:
            break
        }
      },
    },
  })

  React.useEffect(() => {
    send({type: 'CHANGE', currentPeriod})
  }, [currentPeriod, send])
}

const trackEpochPeriodMachine = createMachine(
  {
    initial: 'idle',
    states: {
      idle: {
        on: {
          CHANGE: [
            {
              target: 'tracking',
              actions: ['assignCurrentPeriod', 'onChangeCurrentPeriod'],
              cond: 'isKnownCurrentPeriod',
            },
          ],
        },
      },
      tracking: {
        on: {
          CHANGE: [
            {
              actions: [
                choose([
                  {
                    actions: ['assignCurrentPeriod', 'onChangeCurrentPeriod'],
                    cond: 'didChangeCurrentPeriod',
                  },
                ]),
              ],
            },
          ],
        },
      },
    },
  },
  {
    actions: {
      assignCurrentPeriod: assign({
        currentPeriod: (_, {currentPeriod}) => currentPeriod,
      }),
    },
    guards: {
      isKnownCurrentPeriod: (_, {currentPeriod}) =>
        [
          EpochPeriod.None,
          EpochPeriod.FlipLottery,
          EpochPeriod.ShortSession,
          EpochPeriod.LongSession,
          EpochPeriod.AfterLongSession,
        ].includes(currentPeriod),
      didChangeCurrentPeriod: (context, {currentPeriod}) =>
        context.currentPeriod !== currentPeriod,
    },
  }
)

export function useCloseValidationStatusToast() {
  const toast = useToast()

  return React.useCallback(() => {
    for (const period of [
      EpochPeriod.FlipLottery,
      EpochPeriod.ShortSession,
      EpochPeriod.LongSession,
      'validationCeremony',
      EpochPeriod.AfterLongSession,
    ]) {
      if (toast.isActive(period)) {
        toast.close(period)
      }
    }
  }, [toast])
}

export function useAutoCloseValidationStatusToast() {
  const close = useCloseValidationStatusToast()

  React.useEffect(() => {
    close()
  }, [close])

  return close
}
