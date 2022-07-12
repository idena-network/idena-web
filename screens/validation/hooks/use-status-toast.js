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
import {useIdentity} from '../../../shared/providers/identity-context'
import {EpochPeriod} from '../../../shared/types'
import {ValidatonStatusToast} from '../components/status-toast'
import {canValidate} from '../utils'

export function useValidationStatusToast() {
  const {t} = useTranslation()

  const router = useRouter()

  const toast = useToast()

  const [identity] = useIdentity()

  useTrackEpochPeriod({
    onChangeValidationPeriod: currentPeriod => {
      const isFlipLottery = currentPeriod === EpochPeriod.FlipLottery

      const prevToastId = isFlipLottery ? 'validation' : EpochPeriod.FlipLottery
      const nextToastId = isFlipLottery ? EpochPeriod.FlipLottery : 'validation'

      validationPeriods
        .filter(
          period => period !== currentPeriod && toast.isActive(prevToastId)
        )
        .forEach(toast.close)

      if (toast.isActive(nextToastId)) return

      toast({
        id: nextToastId,
        duration: null,
        render: () => (
          <ValidatonStatusToast
            title={
              isFlipLottery
                ? t('Idena validation will start soon')
                : t('Waiting for the end of the long session')
            }
            colorScheme={isFlipLottery ? 'red' : 'green'}
          >
            {canValidate(identity) && (
              <Button
                variant="unstyled"
                onClick={() => {
                  router.push(
                    `/validation/${isFlipLottery ? 'lottery' : 'after'}`
                  )
                }}
              >
                {t('Show countdown')}
              </Button>
            )}
          </ValidatonStatusToast>
        ),
      })
    },
    onNone: toast.closeAll,
  })
}

function useTrackEpochPeriod({
  onNone,
  onFlipLottery,
  onShortSession,
  onLongSession,
  onAfterLongSession,
  onChangeCurrentPeriod,
  onChangeValidationPeriod,
}) {
  const epoch = useEpoch()
  const currentPeriod = epoch?.currentPeriod

  const [, send] = useMachine(trackEpochPeriodMachine, {
    actions: {
      // eslint-disable-next-line no-shadow
      onChangeCurrentPeriod: ({currentPeriod}) => {
        onChangeCurrentPeriod?.(currentPeriod)

        if (validationPeriods.includes(currentPeriod)) {
          onChangeValidationPeriod?.(currentPeriod)
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

const validationPeriods = [
  EpochPeriod.FlipLottery,
  EpochPeriod.ShortSession,
  EpochPeriod.LongSession,
  EpochPeriod.AfterLongSession,
]
