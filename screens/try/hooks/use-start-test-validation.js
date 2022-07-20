import {useRouter} from 'next/router'
import React from 'react'
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
