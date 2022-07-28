import {useRouter} from 'next/router'
import React from 'react'
import {useInterval} from '../../../shared/hooks/use-interval'
import {useAuthState} from '../../../shared/providers/auth-context'
import {useEpoch} from '../../../shared/providers/epoch-context'
import {useIdentity} from '../../../shared/providers/identity-context'
import {EpochPeriod} from '../../../shared/types'
import {canValidate, shouldStartValidation} from '../utils'

export function useAutoStartValidation() {
  const router = useRouter()

  const epoch = useEpoch()
  const [identity] = useIdentity()

  const isCandidate = React.useMemo(() => canValidate(identity), [identity])

  useInterval(
    () => {
      if (shouldStartValidation(epoch, identity)) {
        router.push('/validation')
      }
    },
    isCandidate ? 1000 : null
  )
}

export function useAutoStartLottery() {
  const router = useRouter()

  const epoch = useEpoch()
  const [identity] = useIdentity()

  const isCandidate = React.useMemo(() => canValidate(identity), [identity])

  const [didCloseLotteryScreen] = useCloseLotteryScreen()

  useInterval(
    () => {
      if (epoch?.currentPeriod === EpochPeriod.FlipLottery) {
        router.push('/validation/lottery')
      }
    },
    isCandidate && !didCloseLotteryScreen ? 1000 : null
  )
}

export function useCloseLotteryScreen() {
  const {coinbase} = useAuthState()

  const [didClose, setDidClose] = React.useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(
          sessionStorage.getItem([`didCloseLotteryScreen-${coinbase}`])
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
      sessionStorage.setItem(`didCloseLotteryScreen-${coinbase}`, value)
      setDidClose(value)
    },
  ]
}
