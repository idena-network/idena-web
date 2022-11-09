import {useRouter} from 'next/router'
import React from 'react'
import {useInterval} from '../../../shared/hooks/use-interval'
import {useAuthState} from '../../../shared/providers/auth-context'
import {useTestValidationState} from '../../../shared/providers/test-validation-context'
import {CertificateType, EpochPeriod} from '../../../shared/types'

export function useAutoStartTestValidation() {
  const start = useStartTestValidation()

  const {current} = useTestValidationState()
  const period = current?.period

  useInterval(() => {
    if (period === EpochPeriod.ShortSession) {
      start()
    }
  }, 1000)
}

export function useStartTestValidation() {
  const {push: redirect} = useRouter()
  const {current} = useTestValidationState()

  return React.useCallback(() => {
    if (current?.type === CertificateType.Sample) {
      return redirect('/try/sample')
    }
    redirect('/try/validation')
  }, [current, redirect])
}

export function useAutoStartTestLottery() {
  const router = useRouter()

  const {coinbase} = useAuthState()

  const {current} = useTestValidationState()
  const period = current?.period

  useInterval(() => {
    if (period === EpochPeriod.FlipLottery) {
      try {
        const didCloseTestLotteryScreen = JSON.parse(
          sessionStorage.getItem('didCloseTestLotteryScreen')
        )

        const isSameIdentity = didCloseTestLotteryScreen?.address === coinbase

        if (!isSameIdentity) router.push('/try/lottery')
      } catch (e) {
        console.error(e)

        router.push('/try/lottery')
      }
    }
  }, 1000)
}
