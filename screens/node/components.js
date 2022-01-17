/* eslint-disable react/prop-types */
import {
  Box,
  Flex,
  FormControl,
  FormHelperText,
  Heading,
  Radio,
  Stack,
  Link,
  Alert,
} from '@chakra-ui/react'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {getRawTx, buyKey} from '../../shared/api'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  FormLabel,
  Input,
} from '../../shared/components/components'
import {ReceiveIcon} from '../../shared/components/icons'
import useApikeyPurchasing from '../../shared/hooks/use-apikey-purchasing'
import useRpc from '../../shared/hooks/use-rpc'
import {useFailToast} from '../../shared/hooks/use-toast'
import {Transaction} from '../../shared/models/transaction'
import {useAuthState} from '../../shared/providers/auth-context'
import {privateKeyToPublicKey} from '../../shared/utils/crypto'

export function BuySharedNodeForm({
  isOpen,
  onClose,
  providerId,
  from,
  to,
  amount,
}) {
  const [submitting, setSubmitting] = useState(false)

  const {coinbase, privateKey} = useAuthState()

  const failToast = useFailToast()

  const [{result: balanceResult}] = useRpc('dna_getBalance', true, from)

  const [{result: epochResult}] = useRpc('dna_epoch', true)

  const {isPurchasing, savePurchase} = useApikeyPurchasing()

  const transfer = async () => {
    setSubmitting(true)
    try {
      const rawTx = await getRawTx(
        0,
        coinbase,
        to,
        amount,
        0,
        privateKeyToPublicKey(privateKey),
        0,
        true
      )

      const tx = new Transaction().fromHex(rawTx)
      tx.sign(privateKey)
      const result = await buyKey(coinbase, `0x${tx.toHex()}`, providerId)
      savePurchase(result.id, providerId)
    } catch (e) {
      failToast(`Failed to send iDNA: ${e.response?.data || 'unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const waiting = submitting || isPurchasing

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
          <ReceiveIcon boxSize={6} color="blue.500" />
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
            <Input isDisabled value={to} />
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
          borderTopColor="gray.100"
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

export function ChooseItemRadio({isChecked, onChange, ...props}) {
  return (
    <Radio
      isChecked={isChecked}
      onChange={onChange}
      borderColor="white"
      sx={{
        '&[data-checked]': {
          color: 'gray.500',
        },
      }}
      _disabled={{
        bg: 'none',
        borderColor: 'gray.300',
      }}
      {...props}
    />
  )
}

function ErrorAlert(props) {
  return (
    <Alert
      status="error"
      bg="red.500"
      borderWidth="1px"
      borderColor="red.050"
      fontWeight={500}
      color="white"
      rounded="md"
      px={6}
      py={4}
      w="480px"
      mt={2}
      {...props}
    />
  )
}

export function ProviderOfflineAlert({url, provider}) {
  const {t} = useTranslation()
  return (
    <ErrorAlert>
      <Flex direction="column" fontSize="mdx">
        <Flex>
          <Flex>
            {t('The node is unavailable:', {
              nsSeparator: '|',
            })}
          </Flex>
          <Flex ml={1}>{url}</Flex>
        </Flex>
        <Flex>
          <Flex>
            {t('Please contact the node owner:', {
              nsSeparator: '|',
            })}
          </Flex>
          <Link href={`https://t.me/${provider}`} target="_blank" ml={1}>
            {provider}
            {' >'}
          </Link>
        </Flex>
      </Flex>
    </ErrorAlert>
  )
}

export function NodeOfflineAlert({url}) {
  const {t} = useTranslation()
  return (
    <ErrorAlert>
      <Flex direction="column" fontSize="mdx">
        <Flex>
          <Flex>
            {t('The node is unavailable:', {
              nsSeparator: '|',
            })}
          </Flex>
          <Flex ml={1}>{url}</Flex>
        </Flex>
      </Flex>
    </ErrorAlert>
  )
}

export function KeyExpiredAlert({url, apiKey}) {
  const {t} = useTranslation()
  return (
    <ErrorAlert>
      <Flex direction="column" fontSize="mdx">
        <Flex>
          <Flex>
            {t('Can not connect to the node:', {
              nsSeparator: '|',
            })}
          </Flex>
          <Flex ml={1}>{url}</Flex>
        </Flex>
        <Flex>
          <Flex>
            {t('The API key {{apiKey}} is expired', {
              apiKey,
            })}
          </Flex>
        </Flex>
      </Flex>
    </ErrorAlert>
  )
}
