import {useMachine} from '@xstate/react'
import {useMemo, useEffect} from 'react'
import {createValidationFlipsMachine} from '../../screens/validation/machine'
import {useAuthState} from '../providers/auth-context'
import {useEpochState} from '../providers/epoch-context'
import {info} from '../utils/logs'

export default function Flips() {
  const {coinbase, privateKey} = useAuthState()
  const epoch = useEpochState()

  if (coinbase && privateKey && epoch) {
    return (
      <FlipsMachine coinbase={coinbase} privateKey={privateKey} epoch={epoch} />
    )
  }

  return null
}

function FlipsMachine({coinbase, privateKey, epoch}) {
  const validationFlipsMachine = useMemo(
    () => createValidationFlipsMachine(),
    []
  )

  const [_, send] = useMachine(validationFlipsMachine, {
    logger: msg => info({coinbase, machine: 'flips'}, msg),
  })

  useEffect(() => {
    if (epoch && privateKey && epoch.currentPeriod !== 'None') {
      send('START', {coinbase, privateKey, epoch: epoch?.epoch ?? 0})
    }
  }, [coinbase, epoch, privateKey, send])

  return null
}
