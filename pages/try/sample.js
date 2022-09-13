/* eslint-disable react/prop-types */
import {useMachine} from '@xstate/react'
import {useEffect, useMemo} from 'react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {Box, Image, Stack, Text, useDisclosure} from '@chakra-ui/react'
import {createValidationMachine} from '../../screens/validation/machine'
import {
  sessionFlips,
  ValidationScreen,
} from '../../screens/validation/components'
import {useAuthState} from '../../shared/providers/auth-context'
import {LayoutContainer} from '../../screens/app/components'
import Auth from '../../shared/components/auth'
import {decodedWithoutKeywords} from '../../screens/validation/utils'
import {
  TEST_LONG_SESSION_INTERVAL_SEC,
  TEST_SHORT_SESSION_INTERVAL_SEC,
  useTestValidationDispatch,
  useTestValidationState,
} from '../../shared/providers/test-validation-context'
import {CertificateType} from '../../shared/types'
import {useAutoCloseTestValidationToast} from '../../screens/try/hooks/use-test-validation-toast'
import {
  fetchFlips,
  GetSampleLongHashes,
  GetSampleShortHashes,
  loadWords,
} from '../../screens/try/utils'
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  ErrorAlert,
} from '../../shared/components/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {GetReasonDesc} from '../../screens/try/components'

export default function SamplePage() {
  const {auth, privateKey, coinbase} = useAuthState()
  const {current, timestamp, last} = useTestValidationState()
  const router = useRouter()

  // hack to redirect only when new page /try/validation is opened
  // and do not redirect right after validation ends.
  useEffect(() => {
    if (timestamp && !current) {
      if (Math.abs(timestamp - new Date().getTime()) > 3 * 1000) {
        return router.push('/try')
      }
    }
  }, [current, router, timestamp])

  useAutoCloseTestValidationToast()

  if (!auth) {
    return (
      <LayoutContainer>
        <Auth />
      </LayoutContainer>
    )
  }

  const startTime = current?.startTime || last?.startTime

  if (privateKey && coinbase && startTime)
    return (
      <ValidationSession
        coinbase={coinbase}
        privateKey={privateKey}
        validationStart={current?.startTime || last?.startTime}
        shortSessionDuration={TEST_SHORT_SESSION_INTERVAL_SEC}
        longSessionDuration={TEST_LONG_SESSION_INTERVAL_SEC}
      />
    )

  return null
}

function ValidationSession({
  privateKey,
  coinbase,
  validationStart,
  shortSessionDuration,
  longSessionDuration,
}) {
  const {scheduleValidation, checkValidation} = useTestValidationDispatch()
  const {t} = useTranslation()

  const approveFlipDisclosure = useDisclosure()
  const reportFlipDisclosure = useDisclosure()
  const abstainFlipDisclosure = useDisclosure()
  const successDisclosure = useDisclosure()

  const {i18n} = useTranslation()

  const router = useRouter()

  const {
    isOpen: isExceededTooltipOpen,
    onOpen: onOpenExceededTooltip,
    onClose: onCloseExceededTooltip,
  } = useDisclosure()

  const validationMachine = useMemo(
    () =>
      createValidationMachine({
        privateKey,
        coinbase,
        epoch: 0,
        validationStart,
        shortSessionDuration,
        longSessionDuration,
        locale: i18n.language || 'en',
        isTraining: true,
        isSample: true,
      }),
    [
      coinbase,
      i18n.language,
      longSessionDuration,
      privateKey,
      shortSessionDuration,
      validationStart,
    ]
  )
  const [state, send] = useMachine(validationMachine, {
    actions: {
      onExceededReports: () => {
        onOpenExceededTooltip()
        setTimeout(onCloseExceededTooltip, 3000)
      },
      onValidationSucceeded: async () => {
        await checkValidation()
        successDisclosure.onOpen()
      },
      needToApprove: () => {
        approveFlipDisclosure.onOpen()
      },
      needToReport: () => {
        reportFlipDisclosure.onOpen()
      },
      needToAbstain: () => {
        abstainFlipDisclosure.onOpen()
      },
    },
    services: {
      fetchIdentity: () => Promise.resolve({}),
      fetchShortHashes: () => Promise.resolve(GetSampleShortHashes()),
      fetchShortFlips: ({shortFlips}) => cb =>
        fetchFlips(
          shortFlips
            .filter(({missing, fetched}) => !fetched && !missing)
            .map(({hash}) => hash),
          cb
        ),
      fetchLongHashes: () => Promise.resolve(GetSampleLongHashes()),
      fetchLongFlips: ({longFlips}) => cb =>
        fetchFlips(
          longFlips
            .filter(({missing, fetched}) => !fetched && !missing)
            .map(({hash}) => hash),
          cb
        ),
      sendPublicFlipKey: () => Promise.resolve({}),
      submitHash: () => Promise.resolve({}),
      fetchWords: ({longFlips}) =>
        loadWords(longFlips.filter(decodedWithoutKeywords)),
      fetchWordsSeed: () => Promise.resolve('0x'),
      submitShortAnswers: () => Promise.resolve({}),
      submitLongAnswers: () => Promise.resolve({}),
    },
  })

  const {currentIndex} = state.context

  const flips = sessionFlips(state)
  const currentFlip = flips[currentIndex]

  return (
    <>
      <ValidationScreen
        state={state}
        send={send}
        validationStart={validationStart}
        shortSessionDuration={shortSessionDuration}
        longSessionDuration={longSessionDuration}
        isExceededTooltipOpen={isExceededTooltipOpen}
      />
      <Dialog {...approveFlipDisclosure}>
        <DialogHeader>{t('Approve the flip!')}</DialogHeader>
        <DialogBody>
          <Stack spacing={3}>
            <Text color="muted">
              {t(
                `This flip follows the rules. Please approve all good flips clicking Approve button.`
              )}
            </Text>
            <Box>
              <Image src="/static/sample-validation/approve.png" />
            </Box>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <SecondaryButton onClick={() => approveFlipDisclosure.onClose()}>
            {t('Got it')}
          </SecondaryButton>
        </DialogFooter>
      </Dialog>
      <Dialog {...reportFlipDisclosure}>
        <DialogHeader>{t('Report the flip!')}</DialogHeader>
        <DialogBody>
          <Stack spacing={3}>
            <Text color="muted">
              {t(
                `This flip doesn’t follow the rules. Please report bad flips next time clicking the Report button.`
              )}
            </Text>
            <Box>
              <Image src="/static/sample-validation/report.png" />
            </Box>
            <ErrorAlert>
              <Text>{`${t('Reporting reason')}: ${GetReasonDesc(
                t,
                currentFlip?.isReported
              )}`}</Text>
            </ErrorAlert>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <SecondaryButton onClick={() => reportFlipDisclosure.onClose()}>
            {t('Got it')}
          </SecondaryButton>
        </DialogFooter>
      </Dialog>
      <Dialog {...abstainFlipDisclosure} size="md">
        <DialogHeader>{t('Do not approve the flip!')}</DialogHeader>
        <DialogBody>
          <Stack spacing={3}>
            <Text color="muted">
              {t(
                `This flip doesn’t follow the rules. Do not approve the flip. Skip bad flips if you have no reports left.`
              )}
            </Text>
            <Box>
              <Image src="/static/sample-validation/abstain.png" />
            </Box>
            <ErrorAlert>
              <Text>{`${t('Reporting reason')}: ${GetReasonDesc(
                t,
                currentFlip?.isReported
              )}`}</Text>
            </ErrorAlert>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <SecondaryButton onClick={() => abstainFlipDisclosure.onClose()}>
            {t('Got it')}
          </SecondaryButton>
        </DialogFooter>
      </Dialog>
      {state.matches('validationFailed') && (
        <Dialog isOpen size="md">
          <DialogHeader>{t("Time's up!")}</DialogHeader>
          <DialogBody>
            <Stack spacing={3}>
              <Text color="muted">
                {t(
                  `Unfortunately you did not submit answers in time. Please keep an eye on the timer next time.`
                )}
              </Text>
              <Box>
                <Image src="/static/sample-validation/timeout.png" />
              </Box>
            </Stack>
          </DialogBody>
          <DialogFooter>
            <SecondaryButton onClick={() => router.push('/try')}>
              {t('Got it')}
            </SecondaryButton>
            <PrimaryButton
              onClick={async () => {
                await scheduleValidation(CertificateType.Sample)
                router.push('/try/lottery')
              }}
            >
              {t('Try again')}
            </PrimaryButton>
          </DialogFooter>
        </Dialog>
      )}
      <Dialog {...successDisclosure} size="md">
        <DialogHeader>{t('Success!')}</DialogHeader>
        <DialogBody>
          <Stack spacing={3}>
            <Text>
              {t(
                `The Idena protocol allows you to validate your address and get the Human status without using your personal data. All you need to do is prove that you are a real human and you don't have multiple accounts.`
              )}
            </Text>
            <Text>
              {t(
                `Start training validation to learn how to prove that you are not a bot.`
              )}
            </Text>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <SecondaryButton onClick={() => router.push('/home')}>
            {t('Skip')}
          </SecondaryButton>
          <PrimaryButton onClick={() => router.push('/try')}>
            {t('Get certificate')}
          </PrimaryButton>
        </DialogFooter>
      </Dialog>
    </>
  )
}
