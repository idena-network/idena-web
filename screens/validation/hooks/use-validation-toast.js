/* eslint-disable no-unused-expressions */
/* eslint-disable no-use-before-define */
import {Button, useToast} from '@chakra-ui/react'
import {useMachine} from '@xstate/react'
import {useRouter} from 'next/router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {createMachine} from 'xstate'
import {assign, choose} from 'xstate/lib/actions'
import {useCloseToast} from '../../../shared/hooks/use-toast'
import {useEpoch} from '../../../shared/providers/epoch-context'
import {EpochPeriod} from '../../../shared/types'
import {ValidatonStatusToast} from '../components/status-toast'
import {useCloseLotteryScreen} from './use-auto-start'

export function useValidationToast() {
  const {t} = useTranslation()

  const router = useRouter()

  const toast = useToast()

  const closeValidationToasts = useCloseValidationToast()

  const closeToast = useCloseToast()

  const [didCloseLotteryScreen] = useCloseLotteryScreen()

  useTrackEpochPeriod({
    onChangeCurrentPeriod: currentPeriod => {
      ;[
        EpochPeriod.FlipLottery,
        EpochPeriod.ShortSession,
        EpochPeriod.LongSession,
        EpochPeriod.AfterLongSession,
      ]
        .filter(period => period !== currentPeriod)
        .forEach(closeToast)
    },
    onFlipLottery: () => {
      if (!didCloseLotteryScreen) return

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

export function useCloseValidationToast() {
  const closeToast = useCloseToast()

  return React.useCallback(() => {
    ;[
      EpochPeriod.FlipLottery,
      EpochPeriod.ShortSession,
      EpochPeriod.LongSession,
      'validationCeremony',
      EpochPeriod.AfterLongSession,
    ].forEach(closeToast)
  }, [closeToast])
}

export function useAutoCloseValidationToast() {
  const close = useCloseValidationToast()

  React.useEffect(() => {
    close()
  }, [close])

  return close
}
