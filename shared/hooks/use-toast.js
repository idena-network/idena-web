import {useToast} from '@chakra-ui/react'
import {Toast} from '../components/components'

export const useSuccessToast = () => useStatusToast()

export const useFailToast = () => useStatusToast('error')

const DURATION = 5000

export function useStatusToast(status) {
  const toast = useToast()

  const resolveToastParams = params =>
    typeof params === 'string' ? {title: params} : params

  return params =>
    toast({
      status,
      duration: DURATION,
      // eslint-disable-next-line react/display-name
      render: () => (
        <Toast
          status={status}
          duration={DURATION}
          {...resolveToastParams(params)}
        />
      ),
    })
}
