import {useQuery} from 'react-query'
import {State} from 'xstate'
import {useCoinbase} from '../../ads/hooks'
import {loadValidationState} from '../utils'

export function useValidationState(options) {
  const coinbase = useCoinbase()

  return useQuery({
    queryKey: ['validationState', coinbase],
    queryFn: () => {
      const validationStateDefinition = loadValidationState()

      if (validationStateDefinition) {
        return State.create(validationStateDefinition)
      }
    },
    ...options,
  })

  // const [submitHash, setSubmitHash] = React.useState()

  // const [isPending, {off: setIsPendingOff}] = useBoolean(true)

  // React.useEffect(() => {
  //   const validationStateDefinition = loadValidationState()
  //   const validationState = validationStateDefinition
  //     ? State.create(validationStateDefinition).done
  //     : {done: false, submitHash: null}

  //   if (validationState?.done) {
  //     setIsPendingOff()
  //   }

  //   setSubmitHash(validationState?.submitHash)
  // }, [setIsPendingOff])
}
