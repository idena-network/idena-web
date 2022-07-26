import {useRouter} from 'next/router'
import React from 'react'
import {useInterval} from '../../../shared/hooks/use-interval'
import {useAuthState} from '../../../shared/providers/auth-context'
import {useTestValidationState} from '../../../shared/providers/test-validation-context'
import {EpochPeriod} from '../../../shared/types'

export function useAutoStartTestValidation() {
  const start = useStartTestValidation()

  const {current} = useTestValidationState()
  const period = current?.period

  React.useEffect(() => {
    if (period === EpochPeriod.ShortSession) {
      start()
    }
  }, [period, start])
}

export function useStartTestValidation() {
  const {push: redirect} = useRouter()

  return React.useCallback(() => {
    redirect('/try/validation')
  }, [redirect])
}

export function useAutoStartTestLottery() {
  const router = useRouter()

  const {current} = useTestValidationState()
  const period = current?.period

  const [didCloseTestLotteryScreen] = useCloseTestLotteryScreen()

  useInterval(
    () => {
      if (period === EpochPeriod.FlipLottery) {
        router.push('/try/lottery')
      }
    },
    !didCloseTestLotteryScreen ? 1000 : null
  )
}

export function useCloseTestLotteryScreen() {
  const {coinbase} = useAuthState()

  const [didClose, setDidClose] = React.useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(
          sessionStorage.getItem([`didCloseTestLotteryScreen-${coinbase}`])
        )
      } catch (e) {
        console.error(e)
        return false
      }
    }
  })

  return [
    didClose,
    value => {
      sessionStorage.setItem([`didCloseTestLotteryScreen-${coinbase}`, value])
      setDidClose(value)
    },
  ]
}
