import React, {useEffect} from 'react'
import PropTypes from 'prop-types'
import {useTranslation} from 'react-i18next'
import {Flex, Heading, Icon, Stack} from '@chakra-ui/core'
import {Box} from '../../../shared/components'
import {useNotificationDispatch} from '../../../shared/providers/notification-context'
import {useWallets} from '../../../shared/hooks/use-wallets'
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  FormControlWithLabel,
  Input,
  Select,
} from '../../../shared/components/components'
import {PrimaryButton} from '../../../shared/components/button'
import {useAuthState} from '../../../shared/providers/auth-context'

function TransferForm({onSuccess, onFail, isOpen, onClose}) {
  const {wallets, sendTransaction} = useWallets()
  const {privateKey} = useAuthState()

  const selectWallets =
    wallets &&
    wallets.filter(wallet => !wallet.isStake).map(wallet => wallet.address)

  const [from, setFrom] = React.useState(
    selectWallets.length > 0 ? selectWallets[0] : null
  )

  useEffect(() => {
    if (!from) {
      setFrom(selectWallets.length > 0 ? selectWallets[0] : null)
    }
  }, [from, selectWallets])

  const [to, setTo] = React.useState()
  const [amount, setAmount] = React.useState()

  const [submitting, setSubmitting] = React.useState(false)

  const {addNotification, addError} = useNotificationDispatch()

  const {t} = useTranslation()

  const send = async () => {
    try {
      setSubmitting(true)

      const result = await sendTransaction(privateKey, {
        from,
        to,
        amount,
      })

      addNotification({
        title: t('Transaction sent'),
        body: result,
      })
      if (onSuccess) onSuccess(result)
    } catch (error) {
      addError({
        title: t('error:Error while sending transaction'),
        body: error.message,
      })
      if (onFail) {
        onFail(error)
      }
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
            <Select
              size="md"
              value={selectWallets[0]}
              onChange={e => setFrom(e.target.value)}
            >
              {selectWallets.map(wallet => (
                <option value={wallet}>{wallet}</option>
              ))}
            </Select>
            {/* <Select
              name="select"
              id=""
              options={selectWallets}
              value={selectWallets[0]}
              onChange={e => setFrom(e.target.value)}
              border="0"
            /> */}
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
  onSuccess: PropTypes.func,
  onFail: PropTypes.func,
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
}

export default TransferForm
