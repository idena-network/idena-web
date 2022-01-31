import React, {useState} from 'react'
import PropTypes from 'prop-types'
import {useTranslation} from 'react-i18next'
import {Box, Flex, Heading, Stack, useBreakpointValue} from '@chakra-ui/react'
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  FormControlWithLabel,
  Input,
} from '../../../shared/components/components'
import {PrimaryButton} from '../../../shared/components/button'
import {useAuthState} from '../../../shared/providers/auth-context'
import {getRawTx, sendRawTx} from '../../../shared/api'
import {privateKeyToAddress} from '../../../shared/utils/crypto'
import {Transaction} from '../../../shared/models/transaction'
import {SendOutIcon} from '../../../shared/components/icons'
import {useFailToast, useSuccessToast} from '../../../shared/hooks/use-toast'

function isAddress(address) {
  return address.length === 42 && address.substr(0, 2) === '0x'
}

function TransferForm({isOpen, onClose}) {
  const {coinbase, privateKey} = useAuthState()

  const [to, setTo] = useState()
  const [amount, setAmount] = useState()

  const [submitting, setSubmitting] = useState(false)
  const size = useBreakpointValue(['lg', 'md'])
  const variant = useBreakpointValue(['outlineMobile', 'outline'])
  const labelFontSize = useBreakpointValue(['base', 'md'])

  const {t} = useTranslation()

  const successToast = useSuccessToast()
  const failToast = useFailToast()

  const send = async () => {
    try {
      setSubmitting(true)

      if (!isAddress(to)) {
        throw new Error(`Incorrect 'To' address: ${to}`)
      }
      if (amount <= 0) {
        throw new Error(`Incorrect Amount: ${amount}`)
      }

      const rawTx = await getRawTx(
        0,
        privateKeyToAddress(privateKey),
        to,
        amount
      )

      const tx = new Transaction().fromHex(rawTx)
      tx.sign(privateKey)

      const result = await sendRawTx(`0x${tx.toHex()}`)

      successToast({
        title: t('Transaction sent'),
        description: result,
      })
      if (onClose) onClose()
    } catch (error) {
      failToast({
        title: t('error:Error while sending transaction'),
        description: error.message,
        status: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader mb={8}>
        <Flex direction="column" textAlign={['center', 'start']}>
          <Flex
            order={[2, 1]}
            align="center"
            justify="center"
            mt={[8, 0]}
            h={12}
            w={12}
            rounded="xl"
            bg="red.012"
          >
            <SendOutIcon boxSize={6} />
          </Flex>
          <Heading
            order={[1, 2]}
            color="brandGray.500"
            fontSize={['base', 'lg']}
            fontWeight={[['bold', 500]]}
            lineHeight="base"
            mt={[0, 4]}
          >
            Send iDNA
          </Heading>
        </Flex>
      </DrawerHeader>
      <DrawerBody>
        <Stack spacing={[4, 5]}>
          <FormControlWithLabel label={t('From')} labelFontSize={labelFontSize}>
            <Input
              value={coinbase}
              backgroundColor={['gray.50', 'gray.100']}
              size={size}
              variant={variant}
              isDisabled
            />
          </FormControlWithLabel>
          <FormControlWithLabel label={t('To')} labelFontSize={labelFontSize}>
            <Input
              value={to}
              variant={variant}
              borderColor="gray.100"
              size={size}
              onChange={e => setTo(e.target.value)}
            />
          </FormControlWithLabel>
          <FormControlWithLabel
            label={t('Amount')}
            labelFontSize={labelFontSize}
          >
            <Input
              value={amount}
              variant={variant}
              type="number"
              size={size}
              onChange={e => setAmount(e.target.value)}
            />
          </FormControlWithLabel>
          <PrimaryButton
            display={['flex', 'none']}
            fontSize="mobile"
            size="lg"
            onClick={send}
            isLoading={submitting}
            loadingText={t('Mining...')}
          >
            {t('Send')}
          </PrimaryButton>
        </Stack>
      </DrawerBody>
      <DrawerFooter display={['none', 'flex']}>
        <Box
          alignSelf="stretch"
          borderTop="1px"
          borderTopColor="gray.100"
          mt="auto"
          pt={5}
          width="100%"
        >
          <Stack isInline spacing={2} justify="flex-end">
            <PrimaryButton
              onClick={send}
              isLoading={submitting}
              loadingText={t('Mining...')}
            >
              {t('Transfer')}
            </PrimaryButton>
          </Stack>
        </Box>
      </DrawerFooter>
    </Drawer>
  )
}

TransferForm.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
}

export default TransferForm
