import {Button, useToast} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useCloseToast} from '../../../shared/hooks/use-toast'
import {useTestValidationState} from '../../../shared/providers/test-validation-context'
import {EpochPeriod} from '../../../shared/types'
import {ValidatonStatusToast} from '../../validation/components/toast'

export function useTestValidationToast() {
  const {t} = useTranslation()

  const router = useRouter()

  const toast = useToast()

  const {
    current: currentTrainingValidation,
    epoch: testValidationEpoch,
  } = useTestValidationState()

  React.useEffect(() => {
    if (currentTrainingValidation) {
      const isTrainingValidationSoon =
        testValidationEpoch?.currentPeriod === EpochPeriod.FlipLottery

      if (isTrainingValidationSoon) {
        if (toast.isActive('testValidationSoon')) return

        toast({
          id: 'testValidationSoon',
          duration: null,
          render: () => (
            <ValidatonStatusToast
              title={t('Idena training validation will start soon')}
              colorScheme="red"
            >
              <Button
                variant="unstyled"
                onClick={() => {
                  router.push('/try/lottery')
                }}
              >
                {t('Show countdown')}
              </Button>
            </ValidatonStatusToast>
          ),
        })
      }
    }
  }, [currentTrainingValidation, router, t, testValidationEpoch, toast])
}

export function useCloseTestValidationToast() {
  const close = useCloseToast()

  return React.useCallback(() => {
    close('testValidationSoon')
  }, [close])
}

export function useAutoCloseTestValidationToast() {
  const close = useCloseTestValidationToast()

  React.useEffect(() => {
    close()
  }, [close])
}
