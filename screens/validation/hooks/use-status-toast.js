import {useToast} from '@chakra-ui/react'
import {useRouter} from 'next/dist/client/router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useEpoch} from '../../../shared/providers/epoch-context'
import {EpochPeriod} from '../../../shared/types'
import {ValidatonStatusToast} from '../components/status-toast'

export function useValidationStatusToast() {
  const {t} = useTranslation()

  const router = useRouter()

  const epoch = useEpoch()
  const currentPeriod = epoch?.currentPeriod

  const toast = useToast()

  React.useEffect(() => {
    if (currentPeriod && !toast.isActive(currentPeriod)) {
      toast.closeAll()

      const isFlipLottery = currentPeriod === EpochPeriod.FlipLottery

      toast({
        id: currentPeriod,
        duration: null,
        render: () => (
          <ValidatonStatusToast
            title={
              isFlipLottery
                ? t('Idena validation will start soon')
                : t('Waiting for the end of the long session NEW')
            }
            colorScheme={isFlipLottery ? 'red' : 'green'}
            onShowCountdown={() => {
              router.push(`/validation/${isFlipLottery ? 'lottery' : 'after'}`)
            }}
          />
        ),
      })
    }
  }, [currentPeriod, t, router, toast])
}
