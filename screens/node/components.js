/* eslint-disable react/prop-types */
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  Heading,
  Icon,
  Stack,
} from '@chakra-ui/core'
import {useRouter} from 'next/router'
import {margin, padding, rem, wordWrap} from 'polished'
import {useEffect, useState} from 'react'
import {useQuery} from 'react-query'
import {getRawTx, sendRawTx, getKeyById, buyKey} from '../../shared/api'
import {Field, FormGroup, SubHeading} from '../../shared/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  FormLabel,
  Input,
} from '../../shared/components/components'
import {Transaction} from '../../shared/models/transaction'
import {useAuthState} from '../../shared/providers/auth-context'
import {useNotificationDispatch} from '../../shared/providers/notification-context'
import {
  useSettingsDispatch,
  useSettingsState,
} from '../../shared/providers/settings-context'
import theme from '../../shared/theme'
import {privateKeyToPublicKey} from '../../shared/utils/crypto'

export function BuySharedNodeForm({
  isOpen,
  onClose,
  provider,
  from,
  to,
  amount,
  onCancel,
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const {coinbase, privateKey} = useAuthState()

  const {addNotification, addError} = useNotificationDispatch()

  const {apiKeyId} = useSettingsState()
  const {addApiKeyId, addApiKey} = useSettingsDispatch()

  const {isLoading, data} = useQuery(
    ['get-key-by-id', apiKeyId],
    () => getKeyById(apiKeyId),
    {
      enabled: !!apiKeyId,
      retry: true,
      retryDelay: 5000,
    }
  )

  useEffect(() => {
    if (data) {
      addApiKey(data.key, data.epoch)
      router.push('/')
    }
  }, [addApiKey, data, onClose, router])

  const transfer = async () => {
    setSubmitting(true)
    try {
      const rawTx = await getRawTx(
        0,
        coinbase,
        process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS,
        0,
        0,
        privateKeyToPublicKey(privateKey),
        0,
        true
      )

      const tx = new Transaction().fromHex(rawTx)
      tx.sign(privateKey)
      const result = await buyKey(coinbase, `0x${tx.toHex()}`, provider)
      addApiKeyId(result.id)
    } catch (e) {
      addError(`Failed to send DNA: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const waiting = submitting || isLoading

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      isCloseable={!waiting}
      closeOnEsc={!waiting}
      closeOnOverlayClick={!waiting}
    >
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
          Send DNA's
        </Heading>
      </DrawerHeader>
      <DrawerBody>
        <Stack spacing={5}>
          <CustomFormControl label="From">
            <Input isDisabled value={from} />
            <Flex justify="space-between">
              <FormHelperText color="muted" fontSize="md">
                Available
              </FormHelperText>
              <FormHelperText color="black" fontSize="md">
                123123213 iDNA
              </FormHelperText>
            </Flex>
          </CustomFormControl>
          <CustomFormControl label="To">
            <Input isDisabled value={to} />
          </CustomFormControl>
          <CustomFormControl label="Amount, iDNA">
            <Input isDisabled value={amount} />
            <FormHelperText color="muted" fontSize="md">
              Node operator provides you the shared node for the upcoming
              validation ceremony 18.01.21
            </FormHelperText>
          </CustomFormControl>
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
            <SecondaryButton
              fontSize={13}
              onClick={onCancel}
              isDisabled={waiting}
            >
              Not now
            </SecondaryButton>
            <PrimaryButton
              onClick={transfer}
              isLoading={waiting}
              loadingText="Mining..."
            >
              Transfer
            </PrimaryButton>
          </Stack>
        </Box>
      </DrawerFooter>
    </Drawer>
  )
}

function CustomFormControl({label, children, ...props}) {
  return (
    <FormControl {...props}>
      <FormLabel color="brandGray.500" mb={2}>
        {label}
      </FormLabel>
      {children}
    </FormControl>
  )
}
