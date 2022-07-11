import {Alert, AlertTitle, Button, HStack} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {InfoIcon} from '../../../shared/components/icons'

export function ValidatonStatusToast({title, onShowCountdown, ...options}) {
  const {t} = useTranslation()

  return (
    <Alert variant="validation" {...options}>
      <InfoIcon w="5" h="5" marginEnd="3" />
      <HStack spacing="6">
        <AlertTitle>{title}</AlertTitle>
        <Button variant="unstyled" onClick={onShowCountdown}>
          {t('Show countdown')}
        </Button>
      </HStack>
    </Alert>
  )
}
