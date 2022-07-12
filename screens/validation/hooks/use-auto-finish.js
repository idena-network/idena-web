import {useRouter} from 'next/dist/client/router'
import React from 'react'
import {useEpoch} from '../../../shared/providers/epoch-context'
import {EpochPeriod} from '../../../shared/types'

export function useAutoFinishValidation() {
  const epoch = useEpoch()
  const currentPeriod = epoch?.currentPeriod

  const router = useRouter()

  React.useEffect(() => {
    if (currentPeriod === EpochPeriod.None) {
      router.push('/home')
    }
  }, [currentPeriod, router])
}
