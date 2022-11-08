/* eslint-disable react/prop-types */
import {
  Flex,
  FormControl,
  FormHelperText,
  Heading,
  Radio,
  Stack,
  Link,
  Alert,
  useBreakpointValue,
  Text,
  Button,
  HStack,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import {useEffect, useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {getRawTx, buyKey} from '../../shared/api'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  FormLabel,
  Input,
} from '../../shared/components/components'
import {SendOutIcon} from '../../shared/components/icons'
import useApikeyPurchasing from '../../shared/hooks/use-apikey-purchasing'
import useRpc from '../../shared/hooks/use-rpc'
import {useTimer} from '../../shared/hooks/use-timer'
import {useFailToast} from '../../shared/hooks/use-toast'
import {Transaction} from '../../shared/models/transaction'
import {useAuthState} from '../../shared/providers/auth-context'
import {useEpoch} from '../../shared/providers/epoch-context'
import {privateKeyToPublicKey} from '../../shared/utils/crypto'
import {useIsDesktop} from '../../shared/utils/utils'
import {AdDrawer} from '../ads/containers'

export function BuySharedNodeForm({
  isOpen,
  onClose,
  providerId,
  from,
  to,
  amount,
}) {
  const {t} = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const {coinbase, privateKey} = useAuthState()

  const failToast = useFailToast()

  const [{result: balanceResult}] = useRpc('dna_getBalance', true, from)

  const [{result: epochResult}] = useRpc('dna_epoch', true)

  const {isPurchasing, savePurchase} = useApikeyPurchasing()

  const size = useBreakpointValue(['lg', 'md'])
  const variant = useBreakpointValue(['outlineMobile', 'outline'])
  const labelFontSize = useBreakpointValue(['base', 'md'])

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
    <AdDrawer
      isOpen={isOpen}
      isMining={waiting}
      onClose={onClose}
      isCloseable={!waiting}
      closeOnEsc={!waiting}
      closeOnOverlayClick={!waiting}
    >
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
            <SendOutIcon boxSize={6} color="red.500" />
          </Flex>
          <Heading
            order={[1, 2]}
            color="brandGray.500"
            fontSize={['base', 'lg']}
            fontWeight={[['bold', 500]]}
            lineHeight="base"
            mt={[0, 4]}
          >
            {t('Send iDNA')}
          </Heading>
        </Flex>
      </DrawerHeader>
      <DrawerBody>
        <Stack spacing={[4, 5]}>
          <CustomFormControl label="From" labelFontSize={labelFontSize}>
            <Input
              isDisabled
              value={from}
              backgroundColor={['gray.50', 'gray.100']}
              size={size}
              variant={variant}
            />
            <Flex justify="space-between">
              <FormHelperText color="muted" fontSize="md">
                {t('Available')}
              </FormHelperText>
              <FormHelperText color="black" fontSize="md">
                {(balanceResult && balanceResult.balance) || 0} iDNA
              </FormHelperText>
            </Flex>
          </CustomFormControl>
          <CustomFormControl label="To" labelFontSize={labelFontSize}>
            <Input
              isDisabled
              value={to}
              backgroundColor={['gray.50', 'gray.100']}
              size={size}
              variant={variant}
            />
          </CustomFormControl>
          <CustomFormControl label="Amount, iDNA" labelFontSize={labelFontSize}>
            <Input
              isDisabled
              value={amount}
              backgroundColor={['gray.50', 'gray.100']}
              size={size}
              variant={variant}
            />
            <FormHelperText color="muted" fontSize="md">
              {t(
                'Node operator provides you the shared node for the upcoming validation ceremony'
              )}{' '}
              {epochResult
                ? new Date(epochResult.nextValidation).toLocaleDateString()
                : ''}
            </FormHelperText>
          </CustomFormControl>
        </Stack>
        <PrimaryButton
          mt={8}
          w="100%"
          display={['flex', 'none']}
          fontSize="mobile"
          size="lg"
          onClick={transfer}
          isLoading={waiting}
          loadingText={t('Mining...')}
        >
          {t('Transfer')}
        </PrimaryButton>
      </DrawerBody>
      <DrawerFooter display={['none', 'flex']}>
        <HStack spacing={2} justify="flex-end">
          <SecondaryButton isDisabled={waiting} onClick={onClose}>
            {t('Not now')}
          </SecondaryButton>
          <PrimaryButton
            onClick={transfer}
            isLoading={waiting}
            loadingText={t('Mining...')}
          >
            {t('Transfer')}
          </PrimaryButton>
        </HStack>
      </DrawerFooter>
    </AdDrawer>
  )
}

function CustomFormControl({label, labelFontSize = 'md', children, ...props}) {
  return (
    <FormControl {...props}>
      <FormLabel fontSize={labelFontSize} color="brandGray.500" mb={2}>
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
      w={['auto', '480px']}
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

export function NotNowDialog({isOpen, onClose, onContinue}) {
  const {t} = useTranslation()

  const size = useBreakpointValue(['mdx', 'md'])
  const variantPrimary = useBreakpointValue(['primaryFlat', 'primary'])
  const variantSecondary = useBreakpointValue(['secondaryFlat', 'secondary'])

  const isDesktop = useIsDesktop()

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <DialogHeader>{t('You may fail validation.')}</DialogHeader>
      <DialogBody>
        <Text color="muted">
          {t('Restricted access does not allow validating on this device.')}
        </Text>
      </DialogBody>
      <DialogFooter>
        <Stack isInline={isDesktop} flex={1}>
          <Button
            onClick={onContinue}
            variant={variantSecondary}
            size={size}
            w={['100%', 'auto']}
            color={['gray.500', 'blue.500']}
          >
            {t('Continue with restricted access')}
          </Button>
          <Button
            onClick={onClose}
            variant={variantPrimary}
            size={size}
            w={['100%', 'auto']}
          >
            {t('Cancel')}
          </Button>
        </Stack>
      </DialogFooter>
    </Dialog>
  )
}

function CountdownPart({title, value}) {
  return (
    <Stack spacing={3} alignItems="center">
      <Flex
        w={20}
        h={20}
        bg="gray.500"
        borderRadius="md"
        justifyContent="center"
        alignItems="center"
      >
        <Text color="white" fontSize="28px">
          {value}
        </Text>
      </Flex>
      <Text color="muted">{title}</Text>
    </Stack>
  )
}

export function ValidationCountdown(props) {
  const epoch = useEpoch()
  const {t} = useTranslation()

  const nextValidation = epoch?.nextValidation ?? null

  const duration = useMemo(() => dayjs(nextValidation).diff(), [nextValidation])

  const [{remainingSeconds, isRunning}, {reset}] = useTimer(duration)

  useEffect(() => {
    reset(duration)
  }, [duration, reset])

  return (
    <Stack spacing={3} isInline {...props}>
      <CountdownPart
        title={t('minutes')}
        value={isRunning ? Math.floor(remainingSeconds / 60) : '00'}
      />
      <CountdownPart
        title={t('seconds')}
        value={isRunning ? Math.floor(remainingSeconds % 60) : '00'}
      />
    </Stack>
  )
}
