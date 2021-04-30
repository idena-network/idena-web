import {useMachine} from '@xstate/react'
import {useMemo, useEffect} from 'react'
import {createValidationFlipsMachine} from '../../screens/validation/machine'
import {useAuthState} from '../providers/auth-context'
import {useEpoch} from '../providers/epoch-context'
import {redact} from '../utils/logs'

export default function Flips() {
  const {coinbase, privateKey} = useAuthState()
  const epoch = useEpoch()

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

  const [, send] = useMachine(validationFlipsMachine, {
    logger: msg => console.log(redact(msg)),
  })

  useEffect(() => {
    if (
      epoch &&
      privateKey &&
      (epoch.currentPeriod === 'FlipLottery' ||
        epoch.currentPeriod === 'ShortSession')
    ) {
      send('START', {coinbase, privateKey, epoch: epoch?.epoch ?? 0})
    }
  }, [coinbase, epoch, privateKey, send])

  return null
}
