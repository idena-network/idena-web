import React, {useState} from 'react'
import PropTypes from 'prop-types'
import {Heading, Stack, useToast, Text, Box} from '@chakra-ui/core'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {PrimaryButton} from '../../../shared/components/button'
import {
  Avatar,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  FormControlWithLabel,
  Input,
  Toast,
} from '../../../shared/components/components'
import {useIdentity} from '../../../shared/providers/identity-context'
import {fetchBalance} from '../../../shared/api/wallet'
import {useAuthState} from '../../../shared/providers/auth-context'

// eslint-disable-next-line react/prop-types
function KillForm({isOpen, onClose}) {
  const {t} = useTranslation()
  const {privateKey, coinbase} = useAuthState()
  const [, {killMe}] = useIdentity()
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const [to, setTo] = useState()

  const {
    data: {stake},
  } = useQuery(['get-balance', coinbase], () => fetchBalance(coinbase), {
    initialData: {balance: 0, stake: 0},
    enabled: !!coinbase,
  })

  const terminate = async () => {
    try {
      if (to !== coinbase)
        throw new Error(t('You must specify your own identity address'))

      setSubmitting(true)

      await killMe(privateKey, to)

      toast({
        status: 'success',
        // eslint-disable-next-line react/display-name
        render: () => <Toast title={t('Transaction sent')} />,
      })
      if (onClose) onClose()
    } catch (error) {
      toast({
        // eslint-disable-next-line react/display-name
        render: () => (
          <Toast
            title={error?.message ?? t('error:Error while sending transaction')}
            status="error"
          />
        ),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader mb={6}>
        <Avatar address={coinbase} mx="auto" />
        <Heading
          fontSize="lg"
          fontWeight={500}
          color="brandGray.500"
          mt={4}
          mb={0}
          textAlign="center"
        >
          {t('Terminate identity')}
        </Heading>
      </DrawerHeader>
      <DrawerBody>
        <Text fontSize="md" mb={6}>
          {t(`Terminate your identity and withdraw the stake. Your identity status
            will be reset to 'Not validated'.`)}
        </Text>
        <FormControlWithLabel label={t('Withraw stake, iDNA')}>
          <Input value={stake} isDisabled />
        </FormControlWithLabel>
        <Text fontSize="md" mb={6} mt={6}>
          {t(
            'Please enter your identity address to confirm termination. Stake will be transferred to the identity address.'
          )}
        </Text>
        <FormControlWithLabel label={t('Address')}>
          <Input value={to} onChange={e => setTo(e.target.value)} />
        </FormControlWithLabel>
      </DrawerBody>
      <DrawerFooter>
        <Box
          alignSelf="stretch"
          borderTop="1px"
          borderTopColor="gray.300"
          mt="auto"
          pt={5}
          width="100%"
        >
          <Stack isInline spacing={2} justify="flex-end">
            <PrimaryButton
              onClick={terminate}
              isLoading={submitting}
              variantColor="red"
              _hover={{
                bg: 'rgb(227 60 60)',
              }}
              _active={{
                bg: 'rgb(227 60 60)',
              }}
              _focus={{
                boxShadow: '0 0 0 3px rgb(255 102 102 /0.50)',
              }}
            >
              {t('Terminate')}
            </PrimaryButton>
          </Stack>
        </Box>
      </DrawerFooter>
    </Drawer>
  )
}

KillForm.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
}

export default KillForm
