import React, {useState} from 'react'
import PropTypes from 'prop-types'
import {useTranslation} from 'react-i18next'
import {Box, Flex, Heading, Icon, Stack} from '@chakra-ui/core'
import {useNotificationDispatch} from '../../../shared/providers/notification-context'
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

function isAddress(address) {
  return address.length === 42 && address.substr(0, 2) === '0x'
}

function TransferForm({isOpen, onClose}) {
  const {coinbase, privateKey} = useAuthState()

  const [to, setTo] = useState()
  const [amount, setAmount] = useState()

  const [submitting, setSubmitting] = useState(false)

  const {addNotification, addError} = useNotificationDispatch()

  const {t} = useTranslation()

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

      addNotification({
        title: t('Transaction sent'),
        body: result,
      })
      if (onClose) onClose()
    } catch (error) {
      addError({
        title: t('error:Error while sending transaction'),
        body: error.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader mb={8}>
        <Flex
          align="center"
          justify="center"
          h={12}
          w={12}
          rounded="xl"
          bg="blue.012"
        >
          <Icon name="send-out" w={6} h={6} color="blue.500" />
        </Flex>
        <Heading
          color="brandGray.500"
          fontSize="lg"
          fontWeight={500}
          lineHeight="base"
          mt={4}
        >
          Send iDNA
        </Heading>
      </DrawerHeader>
      <DrawerBody>
        <Stack spacing={5}>
          <FormControlWithLabel label={t('From')}>
            <Input value={coinbase} isDisabled />
          </FormControlWithLabel>
          <FormControlWithLabel label={t('To')}>
            <Input value={to} onChange={e => setTo(e.target.value)} />
          </FormControlWithLabel>
          <FormControlWithLabel label={t('Amount')}>
            <Input
              value={amount}
              type="number"
              onChange={e => setAmount(e.target.value)}
            />
          </FormControlWithLabel>
        </Stack>
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
