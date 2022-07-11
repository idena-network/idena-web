import {useRouter} from 'next/router'
import React from 'react'
import {useInterval} from '../../../shared/hooks/use-interval'
import {useEpoch} from '../../../shared/providers/epoch-context'
import {useIdentity} from '../../../shared/providers/identity-context'
import {canValidate, shouldStartValidation} from '../utils'

export function useAutoStartValidation() {
  const router = useRouter()

  const epoch = useEpoch()
  const [identity] = useIdentity()

  const isEligibleIdentity = React.useMemo(() => canValidate(identity), [
    identity,
  ])

  useInterval(
    () => {
      if (shouldStartValidation(epoch, identity)) {
        router.push('/validation')
      }
    },
    isEligibleIdentity ? 1000 : null
  )
}
