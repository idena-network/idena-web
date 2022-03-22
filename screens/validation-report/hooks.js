import {useMachine} from '@xstate/react'
import React from 'react'
import {useEpoch} from '../../shared/providers/epoch-context'
import {useIdentity} from '../../shared/providers/identity-context'
import {validationReportMachine} from './machines'

export function useTotalValidationScore() {
  const [{totalShortFlipPoints, totalQualifiedFlips}] = useIdentity()
  return Math.min(totalShortFlipPoints / totalQualifiedFlips, 1)
}

export function useValidationReportSummary() {
  const [identity] = useIdentity()

  const epoch = useEpoch()

  const totalScore = useTotalValidationScore()

  const [current, send] = useMachine(validationReportMachine)

  React.useEffect(() => {
    if (epoch && identity?.address)
      send('FETCH', {
        epochNumber: epoch?.epoch - 1,
        identity,
      })
  }, [epoch, identity, send])

  return {
    ...current.context,
    totalScore,
    isLoading: current.matches('idle') || current.matches('fetching'),
    isFailed: current.matches('failed'),
  }
}
