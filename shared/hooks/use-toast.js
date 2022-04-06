import React from 'react'
import {useToast} from '@chakra-ui/react'
import {Toast} from '../components/components'

export const useSuccessToast = () => useStatusToast()

export const useFailToast = () => useStatusToast('error')

const DURATION = 5000

const resolveToastParams = params =>
  // eslint-disable-next-line no-nested-ternary
  typeof params === 'string'
    ? {title: params}
    : params instanceof Error
    ? {title: params?.message}
    : params

export function useStatusToast(status) {
  const toast = useToast()

  return React.useCallback(
    params =>
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
      }),
    [status, toast]
  )
}
