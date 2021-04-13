/* eslint-disable react/prop-types */
import {
  Box,
  Flex,
  FormControl,
  FormHelperText,
  Heading,
  Icon,
  Stack,
} from '@chakra-ui/core'
import dayjs from 'dayjs'
import {useRouter} from 'next/router'
import {useEffect, useState} from 'react'
import {useQuery} from 'react-query'
import {getRawTx, getKeyById, buyKey} from '../../shared/api'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  FormLabel,
  Input,
} from '../../shared/components/components'
import useRpc from '../../shared/hooks/use-rpc'
import {Transaction} from '../../shared/models/transaction'
import {useAuthState} from '../../shared/providers/auth-context'
import {useNotificationDispatch} from '../../shared/providers/notification-context'
import {
  useSettingsDispatch,
  useSettingsState,
} from '../../shared/providers/settings-context'
import {privateKeyToPublicKey} from '../../shared/utils/crypto'

export function BuySharedNodeForm({
  isOpen,
  onClose,
  providerId,
  url,
  from,
  amount,
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const {coinbase, privateKey} = useAuthState()

  const {addError} = useNotificationDispatch()

  const {apiKeyId} = useSettingsState()
  const {addPurchase, addPurchasedKey} = useSettingsDispatch()

  const [{result: balanceResult}] = useRpc('dna_getBalance', true, from)

  const [{result: epochResult}] = useRpc('dna_epoch', true)

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
      addPurchasedKey(url, data.key, data.epoch)
      router.push('/')
    }
  }, [addPurchasedKey, data, onClose, router, url])

  const transfer = async () => {
    setSubmitting(true)
    try {
      const rawTx = await getRawTx(
        0,
        coinbase,
        process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS,
        amount,
        0,
        privateKeyToPublicKey(privateKey),
        0,
        true
      )

      const tx = new Transaction().fromHex(rawTx)
      tx.sign(privateKey)
      const result = await buyKey(coinbase, `0x${tx.toHex()}`, providerId)
      addPurchase(result.id, providerId)
    } catch (e) {
      addError({title: `Failed to send iDNA`, body: e.response.data})
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
          Send iDNA
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
                {(balanceResult && balanceResult.balance) || 0} iDNA
              </FormHelperText>
            </Flex>
          </CustomFormControl>
          <CustomFormControl label="To">
            <Input
              isDisabled
              value={process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS}
            />
          </CustomFormControl>
          <CustomFormControl label="Amount, iDNA">
            <Input isDisabled value={amount} />
            <FormHelperText color="muted" fontSize="md">
              Node operator provides you the shared node for the upcoming
              validation ceremony{' '}
              {epochResult
                ? new Date(epochResult.nextValidation).toLocaleDateString()
                : ''}
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
              onClick={onClose}
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
