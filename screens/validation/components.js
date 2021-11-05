/* eslint-disable no-shadow */
/* eslint-disable react/prop-types */
import React, {useEffect, useMemo, useState} from 'react'
import {
  margin,
  padding,
  borderRadius,
  cover,
  position,
  transparentize,
  rgba,
} from 'polished'
import {FiCheck, FiXCircle, FiChevronLeft, FiChevronRight} from 'react-icons/fi'
import {
  Box as ChakraBox,
  Flex as ChakraFlex,
  Stack,
  Text,
  Heading,
  Alert,
  AlertIcon,
  useTheme,
  Button,
  ListItem,
  AspectRatio,
  Image,
  List,
  Modal,
  ModalOverlay,
  ModalContent,
  useDisclosure,
  useMediaQuery,
} from '@chakra-ui/react'
import {useMachine} from '@xstate/react'
import {Trans, useTranslation} from 'react-i18next'
import dayjs from 'dayjs'
import {useRouter} from 'next/router'
import {State} from 'xstate'
import {Box, Fill, Absolute} from '../../shared/components'
import Flex from '../../shared/components/flex'
import {reorderList} from '../../shared/utils/arr'
import theme, {rem} from '../../shared/theme'
import {adjustDuration} from './machine'
import {Tooltip as TooltipLegacy} from '../../shared/components/tooltip'
import {
  Tooltip,
  Dialog,
  DialogBody,
  DialogFooter,
} from '../../shared/components/components'
import {
  availableReportsNumber,
  decodedWithKeywords,
  filterRegularFlips,
  filterSolvableFlips,
  loadValidationState,
  rearrangeFlips,
} from './utils'
import {Notification, Snackbar} from '../../shared/components/notifications'
import {NotificationType} from '../../shared/providers/notification-context'
import {AnswerType, EpochPeriod, RelevanceType} from '../../shared/types'
import {createTimerMachine} from '../../shared/machines'
import {
  FlipKeywordPanel,
  FlipKeywordTranslationSwitch,
} from '../flips/components'

import {
  IconButton,
  PrimaryButton,
  SecondaryButton,
} from '../../shared/components/button'
import useNodeTiming from '../../shared/hooks/use-node-timing'
import {useInterval} from '../../shared/hooks/use-interval'
import {
  BlockIcon,
  TickIcon,
  TimerIcon,
  InfoIcon,
} from '../../shared/components/icons'
import {TEST_SHORT_SESSION_INTERVAL_SEC} from '../../shared/providers/test-validation-context'

export function ValidationScene(props) {
  return (
    <ChakraFlex
      direction="column"
      h="100vh"
      maxW="full"
      pt={6}
      pb={3}
      pl={10}
      pr={6}
      overflow="hidden"
      {...props}
    />
  )
}

export function Header(props) {
  return (
    <ChakraFlex
      justify="space-between"
      align="center"
      mb={props.isPrettyHigh ? '55px' : '0px'}
      {...props}
    />
  )
}

export function Title(props) {
  return (
    <Heading
      fontSize={rem(24)}
      lineHeight="short"
      fontWeight={500}
      {...props}
    />
  )
}

export function CurrentStep(props) {
  return (
    <Flex
      justify="center"
      flex={1}
      css={{...margin(0, 0, rem(theme.spacings.medium24))}}
      {...props}
    />
  )
}

export function FlipChallenge(props) {
  return <Flex justify="center" align="center" css={{zIndex: 1}} {...props} />
}

export function Flip({
  hash,
  images,
  orders,
  fetched,
  failed,
  decoded,
  option,
  variant,
  onChoose,
  onImageFail,
}) {
  if ((fetched && !decoded) || failed) return <FailedFlip />
  if (!fetched) return <LoadingFlip />

  return (
    <FlipHolder
      css={
        // eslint-disable-next-line no-nested-ternary
        option
          ? option === variant
            ? {
                border: `solid ${rem(2)} ${theme.colors.primary}`,
                boxShadow: `0 0 ${rem(2)} ${rem(3)} ${transparentize(
                  0.75,
                  theme.colors.primary
                )}`,
                transition: 'all .3s cubic-bezier(.5, 0, .5, 1)',
              }
            : {
                opacity: 0.3,
                transform: 'scale(0.98)',
                transition: 'all .3s cubic-bezier(.5, 0, .5, 1)',
              }
          : {}
      }
    >
      {reorderList(images, orders[variant - 1]).map((src, idx) => (
        <Box
          key={idx}
          css={{
            height: 'calc((100vh - 260px) / 4)',
            position: 'relative',
            overflow: 'hidden',
          }}
          onClick={() => onChoose(hash)}
        >
          <FlipBlur src={src} />
          <FlipImage
            src={src}
            alt="current-flip"
            height="100%"
            width="100%"
            style={{
              ...borderRadius('top', idx === 0 ? rem(8) : 'none'),
              ...borderRadius(
                'bottom',
                idx === images.length - 1 ? rem(8) : 'none'
              ),
              position: 'relative',
              zIndex: 1,
            }}
            onError={onImageFail}
          />
        </Box>
      ))}
    </FlipHolder>
  )
}

function FlipHolder({css, ...props}) {
  return (
    <Flex
      justify="center"
      direction="column"
      css={{
        borderRadius: rem(8),
        border: `solid ${rem(2)} ${transparentize(
          0.95,
          theme.colors.primary2
        )}`,
        boxShadow: `0 0 ${rem(2)} 0 ${transparentize(
          0.95,
          theme.colors.primary2
        )}`,
        ...margin(0, rem(10)),
        ...padding(rem(4)),
        position: 'relative',
        height: 'calc(100vh - 260px)',
        width: 'calc((100vh - 240px) / 3)',
        ...css,
      }}
      {...props}
    />
  )
}

function LoadingFlip() {
  return (
    <FlipHolder css={{cursor: 'not-allowed'}}>
      <Fill>
        <ValidationSpinner />
      </Fill>
    </FlipHolder>
  )
}

const defaultOrder = [1, 2, 3, 4]

function FailedFlip() {
  const {t} = useTranslation()
  return (
    <FlipHolder
      css={{
        border: 'none',
        boxShadow: 'none',
        cursor: 'not-allowed',
      }}
    >
      {defaultOrder.map((_, idx) => (
        <Flex
          key={`left-${idx}`}
          justify="center"
          align="center"
          css={{
            background: transparentize(0.16, theme.colors.gray5),
            border: 'solid 1px rgba(210, 212, 217, 0.16)',
            borderBottom:
              idx !== defaultOrder.length - 1
                ? 'none'
                : 'solid 1px rgba(210, 212, 217, 0.16)',
            ...borderRadius('top', idx === 0 ? rem(8) : 'none'),
            ...borderRadius(
              'bottom',
              idx === defaultOrder.length - 1 ? rem(8) : 'none'
            ),
            height: 'calc((100vh - 260px) / 4)',
            overflow: 'hidden',
          }}
        >
          <img
            alt={t('Failed flip')}
            src="/static/body-medium-pic-icn.svg"
            style={{
              height: rem(40),
              width: rem(40),
              opacity: 0.3,
            }}
          />
        </Flex>
      ))}
    </FlipHolder>
  )
}

export function FailedFlipAnnotation(props) {
  return (
    <Box
      style={{
        background: transparentize(0.17, theme.colors.black),
        ...padding(rem(16), rem(42)),
        color: theme.colors.white,
        fontSize: rem(13),
        fontWeight: 500,
        textAlign: 'center',
        position: 'absolute',
        top: '50%',
        left: rem(14),
        right: rem(14),
        transform: 'translateY(-50%)',
        zIndex: 2,
      }}
      {...props}
    ></Box>
  )
}

function FlipBlur({src}) {
  return (
    <div
      style={{
        background: `center center / cover no-repeat url(${src})`,
        filter: `blur(${rem(6)})`,
        ...cover(),
        zIndex: 1,
      }}
    />
  )
}

function FlipImage({
  height = 110,
  width = 147,
  fit = 'contain',
  style,
  ...props
}) {
  const normalize = value =>
    value.toString().endsWith('%') ? value : rem(height)
  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      style={{
        height: normalize(height),
        width: normalize(width),
        objectFit: fit,
        objectPosition: 'center',
        textAlign: 'center',
        ...style,
      }}
      {...props}
    />
  )
}

export function ActionBar(props) {
  return (
    <Flex
      justify="space-between"
      css={{
        ...margin(0, 0, rem(theme.spacings.medium16)),
      }}
      {...props}
    />
  )
}

export function ActionBarItem(props) {
  return <Flex flex={1} css={{minHeight: rem(32), zIndex: 1}} {...props} />
}

const thumbBorderWidth = 2
const thumbMargin = 4
const thumbWidth = 32
const totalThumbWidth = thumbBorderWidth * 2 + thumbMargin * 2 + thumbWidth

export function Thumbnails({currentIndex, ...props}) {
  return (
    <Flex
      align="center"
      css={{
        minHeight: rem(48),
        transform: `translateX(50%) translateX(-${rem(
          totalThumbWidth * (currentIndex + 1 / 2)
        )})`,
        transition: 'transform .3s ease-out',
        willChange: 'transform',
        zIndex: 1,
      }}
      {...props}
    />
  )
}

export function Thumbnail({
  images,
  fetched,
  decoded,
  failed,
  option,
  relevance,
  isCurrent,
  onPick,
}) {
  const isQualified = !!relevance
  const hasIrrelevantWords = relevance === RelevanceType.Irrelevant

  return (
    <ThumbnailHolder
      isCurrent={isCurrent}
      css={{
        border: `solid ${rem(thumbBorderWidth)} ${
          // eslint-disable-next-line no-nested-ternary
          isCurrent
            ? // eslint-disable-next-line no-nested-ternary
              isQualified
              ? hasIrrelevantWords
                ? theme.colors.danger
                : rgba(87, 143, 255, 0.9)
              : theme.colors.primary
            : 'transparent'
        }`,
      }}
      onClick={onPick}
    >
      {((fetched && !decoded) || failed) && <FailedThumbnail />}
      {!fetched && !failed && <LoadingThumbnail />}
      {fetched && decoded && (
        <>
          {(option || isQualified) && (
            <ThumbnailOverlay
              option={option}
              isQualified={isQualified}
              hasIrrelevantWords={hasIrrelevantWords}
            />
          )}
          <FlipImage
            src={images[0]}
            alt={images[0]}
            height={32}
            width={32}
            fit="cover"
            style={{
              borderRadius: rem(12),
              border: isCurrent
                ? 'transparent'
                : 'solid 1px rgb(83 86 92 /0.16)',
            }}
          />
        </>
      )}
    </ThumbnailHolder>
  )
}

function ThumbnailHolder({isCurrent, css, children, ...props}) {
  return (
    <Flex
      justify="center"
      align="center"
      css={{
        border: `solid ${rem(thumbBorderWidth)} ${
          isCurrent ? theme.colors.primary : 'transparent'
        }`,
        borderRadius: rem(12),
        ...css,
      }}
      {...props}
    >
      <Box
        css={{
          height: rem(thumbWidth),
          width: rem(thumbWidth),
          margin: rem(thumbMargin),
          ...position('relative'),
        }}
      >
        {children}
      </Box>
    </Flex>
  )
}

function LoadingThumbnail() {
  return <ValidationSpinner size={24} />
}

function FailedThumbnail() {
  return (
    <Fill
      bg={rgba(89, 89, 89, 0.95)}
      css={{
        borderRadius: rem(12),
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <FiXCircle size={rem(20)} color={theme.colors.white} />
    </Fill>
  )
}

function ThumbnailOverlay({option, isQualified, hasIrrelevantWords}) {
  return (
    <Fill
      bg={
        // eslint-disable-next-line no-nested-ternary
        isQualified
          ? hasIrrelevantWords
            ? transparentize(0.1, theme.colors.danger)
            : rgba(87, 143, 255, 0.9)
          : rgba(89, 89, 89, 0.95)
      }
      css={{
        borderRadius: rem(12),
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {option && <FiCheck size={rem(20)} color={theme.colors.white} />}
    </Fill>
  )
}

export function FlipWords({
  currentFlip: {words = []},
  translations = {},
  children,
  isShowGtLink = true,
}) {
  const {t, i18n} = useTranslation()

  const wordTranslations = words.map(({id}) => translations[id])
  const hasApprovedTranslation = wordTranslations.reduce(
    (acc, curr) => !!curr && acc,
    true
  )

  const [showTranslation, setShowTranslation] = React.useState()

  const shouldShowTranslation = showTranslation && hasApprovedTranslation

  return (
    <ChakraBox fontSize="md" color="brandGray.500" ml={rem(32)} w={rem(320)}>
      <FlipKeywordPanel w={rem(320)} mb={8}>
        {words.length ? (
          <FlipKeywordTranslationSwitch
            keywords={{
              words,
              translations: wordTranslations.map(x => (x ? [x] : [])),
            }}
            showTranslation={shouldShowTranslation}
            locale={i18n.language}
            onSwitchLocale={() => setShowTranslation(!showTranslation)}
            isInline={false}
            isShowGtLink={isShowGtLink}
          />
        ) : (
          <>
            <Box
              style={{
                color: theme.colors.primary2,
                fontWeight: 500,
                lineHeight: rem(20),
              }}
            >
              {t(`Getting flip keywords...`)}
            </Box>
            {[
              t(
                'Can not load the flip keywords to moderate the story. Please wait or skip this flip.'
              ),
            ].map((word, idx) => (
              <Box
                key={`desc-${idx}`}
                style={{
                  color: theme.colors.muted,
                  lineHeight: rem(20),
                  ...margin(rem(theme.spacings.small8), 0, 0),
                }}
              >
                {word}
              </Box>
            ))}
          </>
        )}
      </FlipKeywordPanel>
      {children}
    </ChakraBox>
  )
}

export function QualificationActions(props) {
  return <Stack isInline spacing={2} align="center" {...props} />
}

// eslint-disable-next-line react/display-name
export const QualificationButton = React.forwardRef(
  ({isSelected, children, ...props}, ref) => {
    const ButtonVariant = isSelected ? PrimaryButton : SecondaryButton
    return (
      <ButtonVariant ref={ref} flex={1} maxW={40} {...props}>
        <Stack isInline spacing={2} align="center" justify="center">
          {isSelected && <TickIcon boxSize={5} />}
          <Text>{children}</Text>
        </Stack>
      </ButtonVariant>
    )
  }
)

export function WelcomeQualificationDialog(props) {
  const {t} = useTranslation()
  return (
    <ValidationDialog
      title={t('Welcome to qualification session')}
      submitText={t('Okay, let’s start')}
      {...props}
    >
      <ValidationDialogBody>
        <Text>
          {t(
            `Your answers for the validation session have been submitted successfully!`
          )}
        </Text>
        <Text>
          {t(`Now solve bunch of flips to check its quality. The flip is qualified
            if the majority, equals more than 2/3 participants, gives the same
            answer.`)}
        </Text>
      </ValidationDialogBody>
    </ValidationDialog>
  )
}

export function NavButton({type, bg, color, ...props}) {
  const isPrev = type === 'prev'
  // eslint-disable-next-line no-shadow
  const Icon = isPrev ? FiChevronLeft : FiChevronRight
  return (
    <Absolute
      top="50%"
      left={isPrev && 0}
      right={isPrev || 0}
      width={rem(280)}
      zIndex={0}
      css={{
        transform: 'translate(0, -50%)',
        overflow: 'hidden',
        height: rem(600),
      }}
      {...props}
    >
      <div>
        <Icon
          fontSize={rem(20)}
          color={color}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) translateX(${
              isPrev ? rem(80) : rem(-80)
            })`,
          }}
        />
        <style jsx>{`
          div {
            border-radius: 50%;
            cursor: pointer;
            height: 100%;
            width: ${rem(560)};
            position: relative;
            transform: translateX(${isPrev ? '-50%' : ''});
            transition: all 0.5s ease-out;
            transition-property: background;
            will-change: background;
          }
          div:hover {
            background: ${bg};
          }
        `}</style>
      </div>
    </Absolute>
  )
}

export function WelcomeKeywordsQualificationDialog(props) {
  const {t} = useTranslation()
  return (
    <ValidationDialog
      title={t('Your answers are not yet submitted')}
      submitText={t('Ok, I understand')}
      {...props}
    >
      <ValidationDialogBody>
        <Text>
          {t('Please qualify the keywords relevance and submit the answers.')}
        </Text>
        <Text>
          {t('The flips with irrelevant keywords will be penalized.')}
        </Text>
      </ValidationDialogBody>
    </ValidationDialog>
  )
}

export function ValidationTimer({validationStart, duration}) {
  const adjustedDuration = useMemo(
    () => adjustDuration(validationStart, duration),
    [duration, validationStart]
  )

  return (
    <Timer>
      <TimerIcon color={theme.colors.danger} mr={1} />
      <TimerClock duration={adjustedDuration} color={theme.colors.danger} />
    </Timer>
  )
}

export function Timer(props) {
  return <Flex align="center" {...props} />
}

export function TimerClock({duration, color}) {
  const [state, send] = useMachine(
    useMemo(() => createTimerMachine(duration), [duration])
  )

  React.useEffect(() => {
    send('DURATION_UPDATE', {duration})
  }, [duration, send])

  const {elapsed} = state.context
  const remaining = duration - elapsed

  return (
    <Box style={{fontVariantNumeric: 'tabular-nums', minWidth: rem(37)}}>
      <Text color={color} fontSize={rem(13)} fontWeight={500}>
        {state.matches('stopped') && '00:00'}
        {state.matches('running') &&
          [Math.floor(remaining / 60), remaining % 60]
            .map(t => t.toString().padStart(2, 0))
            .join(':')}
      </Text>
    </Box>
  )
}

export function SubmitFailedDialog({onSubmit, ...props}) {
  const {t} = useTranslation()
  const [sec, setSec] = useState(5)

  useEffect(() => {
    if (sec === 0) {
      onSubmit()
    }
  }, [onSubmit, sec])

  useInterval(() => setSec(sec - 1), sec ? 1000 : null)

  return (
    <ValidationDialog
      title={t('Submit failed')}
      submitText={`${t('Retry')} (${sec})`}
      onSubmit={onSubmit}
      {...props}
    >
      <DialogBody>
        <Text>{t('An error occured while submitting your answers.')}</Text>
      </DialogBody>
    </ValidationDialog>
  )
}

export function ValidationFailedDialog(props) {
  const {t} = useTranslation()
  return (
    <ValidationDialog
      title={t('Validation failed')}
      submitText={t('Go to My Idena')}
      {...props}
    >
      <ValidationDialogBody>
        <Text>
          {t(
            `You haven't submitted your answers in time. This validation session is over.`
          )}
        </Text>
        <Text>
          {t('Come back again to participate in the next validation session.')}
        </Text>
      </ValidationDialogBody>
    </ValidationDialog>
  )
}

function ValidationDialog({submitText, onSubmit, children, ...props}) {
  return (
    <Dialog closeOnOverlayClick={false} closeOnEsc={false} {...props}>
      {children}
      {onSubmit && (
        <ValidationDialogFooter submitText={submitText} onSubmit={onSubmit} />
      )}
    </Dialog>
  )
}

function ValidationDialogBody(props) {
  return (
    <DialogBody>
      <Stack spacing={2} {...props} />
    </DialogBody>
  )
}

function ValidationDialogFooter({submitText, onSubmit, props}) {
  return (
    <DialogFooter {...props}>
      <PrimaryButton onClick={onSubmit}>{submitText}</PrimaryButton>
    </DialogFooter>
  )
}

export function ValidationToast({
  epoch: {currentPeriod, nextValidation},
  isTestValidation,
}) {
  switch (currentPeriod) {
    case EpochPeriod.FlipLottery:
      return (
        <ValidationSoonToast
          validationStart={nextValidation}
          isTestValidation={isTestValidation}
        />
      )
    case EpochPeriod.ShortSession:
    case EpochPeriod.LongSession:
      return isTestValidation ? (
        <TestValidationRunningToast
          key={currentPeriod}
          validationStart={nextValidation}
        />
      ) : (
        <ValidationRunningToast
          key={currentPeriod}
          currentPeriod={currentPeriod}
          validationStart={nextValidation}
        />
      )
    case EpochPeriod.AfterLongSession:
      return <AfterLongSessionToast />
    default:
      return null
  }
}

export function ValidationSoonToast({validationStart, isTestValidation}) {
  const timerMachine = React.useMemo(
    () => createTimerMachine(dayjs(validationStart).diff(dayjs(), 's')),
    [validationStart]
  )

  const [
    {
      context: {duration},
    },
  ] = useMachine(timerMachine)

  const {t} = useTranslation()

  return (
    <Snackbar>
      <Notification
        bg={theme.colors.danger}
        color={theme.colors.white}
        iconColor={theme.colors.white}
        pinned
        type={NotificationType.Info}
        title={<TimerClock duration={duration} color={theme.colors.white} />}
        body={
          isTestValidation
            ? t('Idena training validation will start soon')
            : t('Idena validation will start soon')
        }
      />
    </Snackbar>
  )
}

export function TestValidationRunningToast({validationStart}) {
  const router = useRouter()

  const {t} = useTranslation()

  const timerMachine = React.useMemo(
    () =>
      createTimerMachine(
        dayjs(validationStart)
          .add(TEST_SHORT_SESSION_INTERVAL_SEC, 's')
          .diff(dayjs(), 's')
      ),
    [validationStart]
  )

  const [
    {
      context: {duration},
    },
  ] = useMachine(timerMachine)

  return (
    <Snackbar>
      <Notification
        bg={theme.colors.primary}
        color={theme.colors.white}
        iconColor={theme.colors.white}
        actionColor={theme.colors.white}
        pinned
        type={NotificationType.Info}
        title={<TimerClock duration={duration} color={theme.colors.white} />}
        body={t(`Idena training validation is in progress`)}
        action={() => router.push('/try/validation')}
        actionName={t('Validate')}
      />
    </Snackbar>
  )
}

export function ValidationRunningToast({currentPeriod, validationStart}) {
  const {shortSession, longSession} = useNodeTiming()
  const sessionDuration =
    currentPeriod === EpochPeriod.ShortSession
      ? shortSession
      : shortSession + longSession

  const validationStateDefinition = loadValidationState()
  const done = validationStateDefinition
    ? State.create(validationStateDefinition).done
    : false

  const router = useRouter()

  const {t} = useTranslation()

  const timerMachine = React.useMemo(
    () =>
      createTimerMachine(
        dayjs(validationStart)
          .add(sessionDuration, 's')
          .diff(dayjs(), 's')
      ),
    [validationStart, sessionDuration]
  )

  const [
    {
      context: {duration},
    },
  ] = useMachine(timerMachine)

  return (
    <Snackbar>
      <Notification
        bg={done ? theme.colors.success : theme.colors.primary}
        color={theme.colors.white}
        iconColor={theme.colors.white}
        actionColor={theme.colors.white}
        pinned
        type={NotificationType.Info}
        title={<TimerClock duration={duration} color={theme.colors.white} />}
        body={
          done
            ? `Waiting for the end of ${currentPeriod}`
            : `Idena validation is in progress`
        }
        action={done ? null : () => router.push('/validation')}
        actionName={t('Validate')}
      />
    </Snackbar>
  )
}

export function AfterLongSessionToast() {
  const {t} = useTranslation()
  return (
    <Snackbar>
      <Notification
        bg={theme.colors.success}
        color={theme.colors.white}
        iconColor={theme.colors.white}
        pinned
        type={NotificationType.Info}
        title={t(
          'Please wait. The network is reaching consensus on validated identities'
        )}
      />
    </Snackbar>
  )
}

function ValidationSpinner({size = 30}) {
  return (
    <div>
      <style jsx>{`
        @keyframes donut-spin {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        div {
          display: inline-block;
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-left-color: ${theme.colors.primary};
          border-radius: 50%;
          width: ${rem(size)};
          height: ${rem(size)};
          animation: donut-spin 1.2s linear infinite;

          left: 50%;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
      `}</style>
    </div>
  )
}

export function ReviewValidationDialog({
  flips,
  reportedFlipsCount,
  availableReportsCount,
  isSubmitting,
  onSubmit,
  onMisingAnswers,
  onMisingReports,
  onCancel,
  ...props
}) {
  const {t} = useTranslation()

  const answeredFlipsCount = flips.filter(({option}) => option > 0).length

  const areFlipsUnanswered = answeredFlipsCount < flips.length
  const areReportsMissing = reportedFlipsCount < availableReportsCount

  return (
    <Dialog title={t('Submit the answers')} onClose={onCancel} {...props}>
      <ValidationDialogBody>
        <Stack spacing={6}>
          <Stack spacing={4}>
            <Stack spacing={2}>
              <ReviewValidationDialog.Stat
                label={t('Answered')}
                value={t('{{answeredFlips}} out of {{totalFlips}}', {
                  answeredFlips: answeredFlipsCount,
                  totalFlips: flips.length,
                })}
              />
              <ReviewValidationDialog.Stat
                label={t('Flips reported')}
                value={t(
                  '{{reportedFlipsCount}} out of {{availableReportsCount}}',
                  {
                    reportedFlipsCount,
                    availableReportsCount,
                  }
                )}
              />
            </Stack>
            {(areFlipsUnanswered || areReportsMissing) && (
              <Text color="muted">
                {areFlipsUnanswered && (
                  <Trans i18nKey="reviewMissingFlips" t={t}>
                    You need to answer{' '}
                    <ReviewValidationDialog.LinkButton
                      onClick={onMisingAnswers}
                    >
                      all flips
                    </ReviewValidationDialog.LinkButton>{' '}
                    otherwise you may fail the validation.
                  </Trans>
                )}{' '}
                {areReportsMissing && (
                  <Trans i18nKey="reviewMissingReports" t={t}>
                    In order to get maximum rewards use{' '}
                    <ReviewValidationDialog.LinkButton
                      variant="link"
                      onClick={onMisingReports}
                    >
                      all available reports
                    </ReviewValidationDialog.LinkButton>{' '}
                    for the worst flips.
                  </Trans>
                )}
              </Text>
            )}
          </Stack>
          {areReportsMissing && (
            <Alert
              status="error"
              bg="red.010"
              borderWidth="1px"
              borderColor="red.050"
              fontWeight={500}
              rounded="md"
              px={3}
              py={2}
            >
              <AlertIcon name="info" color="red.500" size={5} mr={3} />
              {t('You may lose rewards. Are you sure?')}
            </Alert>
          )}
        </Stack>
      </ValidationDialogBody>
      <DialogFooter {...props}>
        <SecondaryButton onClick={onCancel}>{t('Cancel')}</SecondaryButton>
        <PrimaryButton
          isLoading={isSubmitting}
          loadingText={t('Submitting answers...')}
          onClick={onSubmit}
        >
          {t('Submit answers')}
        </PrimaryButton>
      </DialogFooter>
    </Dialog>
  )
}

function ReviewValidationDialogStat({label, value, ...props}) {
  return (
    <Flex justify="space-between" {...props}>
      <Text color="muted">{label}</Text>
      <Text>{value}</Text>
    </Flex>
  )
}
ReviewValidationDialog.Stat = ReviewValidationDialogStat

function ReviewValidationDialogLinkButton(props) {
  const {colors} = useTheme()
  return (
    <Button
      variant="link"
      color="muted"
      fontWeight="normal"
      verticalAlign="baseline"
      borderColor="red.500"
      textDecoration={`underline ${colors.muted}`}
      _hover={{
        color: 'brandGray.500',
      }}
      _focus={null}
      {...props}
    />
  )
}
ReviewValidationDialog.LinkButton = ReviewValidationDialogLinkButton

export function BadFlipDialog({title, subtitle, isOpen, onClose, ...props}) {
  const {t} = useTranslation()

  const [flipCase, setFlipCase] = React.useState(0)

  const dirs = [
    '1-keywords-vase-coffee',
    '2-numbers',
    '3-labels',
    '4-text',
    '5-inappropriate-content',
  ]

  // eslint-disable-next-line no-shadow
  const flipUrl = (flipCase, idx) =>
    `/static/flips/${dirs[flipCase]}/${idx}.jpg`

  React.useEffect(() => {
    if (!isOpen) setFlipCase(0)
  }, [isOpen])

  const nextButtonRef = React.useRef()

  return (
    <Modal
      isOpen={isOpen}
      isCentered
      initialFocusRef={nextButtonRef}
      size={664}
      onClose={onClose}
      {...props}
    >
      <ModalOverlay bg="xblack.080" />
      <ModalContent
        bg="transparent"
        color="brandGray.500"
        fontSize="md"
        rounded="lg"
        w="auto"
      >
        <Stack isInline spacing={7} justify="center">
          <Stack
            spacing={0}
            borderColor="brandGray.016"
            borderWidth={1}
            minW={120}
            position="relative"
          >
            <BadFlipPartFrame flipCase={flipCase} />
            <BadFlipImage src={flipUrl(flipCase, 1)} roundedTop="md" />
            <BadFlipImage src={flipUrl(flipCase, 2)} />
            <BadFlipImage src={flipUrl(flipCase, 3)} />
            <BadFlipImage src={flipUrl(flipCase, 4)} roundedBottom="md" />
          </Stack>
          <ChakraFlex
            direction="column"
            justify="space-between"
            spacing={7}
            bg="white"
            borderRadius="lg"
            p={8}
            w={440}
          >
            <Stack spacing={4}>
              <ChakraBox>
                <Heading fontSize="lg" fontWeight={500} lineHeight="32px">
                  {title}
                </Heading>
                <Text color="muted">{subtitle}</Text>
              </ChakraBox>
              <List as="ul">
                <BadFlipListItem
                  flipCase={0}
                  description={
                    <Trans t={t} i18nKey="badFlipKeywordsVaseCoffee">
                      Vase /{' '}
                      <Text as="span" color="red.500">
                        Coffee
                      </Text>
                      . 'Coffee' keyword can not be found on the images
                    </Trans>
                  }
                  isActive={flipCase === 0}
                  onClick={() => {
                    setFlipCase(0)
                  }}
                >
                  {t('One of the keywords is not clearly visible in the story')}
                </BadFlipListItem>
                <BadFlipListItem
                  flipCase={1}
                  isActive={flipCase === 1}
                  onClick={() => {
                    setFlipCase(1)
                  }}
                >
                  {t('There are numbers or letters indicating the order')}
                </BadFlipListItem>
                <BadFlipListItem
                  flipCase={2}
                  isActive={flipCase === 2}
                  onClick={() => {
                    setFlipCase(2)
                  }}
                >
                  {t('There is a sequence of enumerated objects')}
                </BadFlipListItem>
                <BadFlipListItem
                  flipCase={3}
                  description={t(
                    'Some of the Idena users can not not read your the text in your local language'
                  )}
                  isActive={flipCase === 3}
                  onClick={() => {
                    setFlipCase(3)
                  }}
                >
                  {t(
                    'There is text that is necessary to read to solve the flip'
                  )}
                </BadFlipListItem>
                <BadFlipListItem
                  flipCase={4}
                  isActive={flipCase === 4}
                  onClick={() => {
                    setFlipCase(4)
                  }}
                >
                  {t('There is inappropriate content')}
                </BadFlipListItem>
              </List>
            </Stack>
            <Stack isInline justify="flex-end">
              <SecondaryButton onClick={onClose}>{t('Skip')}</SecondaryButton>
              <PrimaryButton
                ref={nextButtonRef}
                onClick={() => {
                  if (flipCase === dirs.length - 1) onClose()
                  else setFlipCase(flipCase + 1)
                }}
              >
                {flipCase === dirs.length - 1
                  ? t('Ok, I understand')
                  : t('Next')}
              </PrimaryButton>
            </Stack>
          </ChakraFlex>
        </Stack>
      </ModalContent>
    </Modal>
  )
}

function BadFlipImage(props) {
  return (
    <AspectRatio ratio={4 / 3} h={100}>
      <Image {...props} />
    </AspectRatio>
  )
}

function BadFlipListItem({
  flipCase,
  description,
  isActive,
  children,
  ...props
}) {
  return (
    <ListItem py={2} cursor="pointer" {...props}>
      <Stack isInline>
        <BadFlipListItemCircle
          bg={isActive ? 'red.500' : 'red.012'}
          color={isActive ? 'white' : 'red.500'}
        >
          {flipCase + 1}
        </BadFlipListItemCircle>
        <Stack spacing={1}>
          <Text>{children}</Text>
          {isActive && description && (
            <Text color="muted" fontSize={12}>
              {description}
            </Text>
          )}
        </Stack>
      </Stack>
    </ListItem>
  )
}

function BadFlipListItemCircle(props) {
  return (
    <ChakraFlex
      align="center"
      justify="center"
      rounded="full"
      fontSize={10}
      fontWeight={500}
      minW={18}
      w={18}
      h={18}
      {...props}
    />
  )
}

function BadFlipPartFrame({flipCase, ...props}) {
  const framePosition = [
    {},
    {},
    {},
    {top: `${100 * 1 - 4}px`, bottom: `${100 * 2 - 4}px`},
    {top: `${100 * 1 - 4}px`, bottom: `${100 * 2 - 4}px`},
  ]
  return (
    <ChakraBox
      position="absolute"
      borderWidth={2}
      borderColor="red.500"
      borderRadius="md"
      boxShadow="0 0 0 4px rgba(255, 102, 102, 0.25)"
      top={-1}
      left={-1}
      right={-1}
      bottom={-1}
      {...framePosition[flipCase]}
      transition="all 0.2s ease-out"
      zIndex={1}
      {...props}
    >
      <ChakraFlex
        align="center"
        justify="center"
        bg="red.500"
        borderRadius="full"
        boxSize={8}
        position="absolute"
        right={-4}
        bottom={-4}
      >
        <BlockIcon boxSize={5} />
      </ChakraFlex>
    </ChakraBox>
  )
}

function ReviewShortSessionDialog({flips, onSubmit, onCancel, ...props}) {
  const {t} = useTranslation()

  const answeredFlipsCount = flips.filter(({option}) => option > 0).length

  const areFlipsUnanswered = answeredFlipsCount < flips.length

  return (
    <Dialog title={t('Submit the answers')} onClose={onCancel} {...props}>
      <ValidationDialogBody>
        <Stack spacing={6}>
          <Stack spacing={4}>
            <Stack spacing={2}>
              <ReviewValidationDialogStat
                label={t('Answered')}
                value={t('{{answeredFlips}} out of {{totalFlips}}', {
                  answeredFlips: answeredFlipsCount,
                  totalFlips: flips.length,
                })}
              />
            </Stack>
            {areFlipsUnanswered && (
              <Text color="muted">
                {areFlipsUnanswered && (
                  <Trans i18nKey="reviewMissingFlips" t={t}>
                    You need to answer{' '}
                    <ReviewValidationDialogLinkButton onClick={onCancel}>
                      all flips
                    </ReviewValidationDialogLinkButton>{' '}
                    otherwise you may fail the validation.
                  </Trans>
                )}
              </Text>
            )}
          </Stack>
        </Stack>
      </ValidationDialogBody>
      <DialogFooter {...props}>
        <SecondaryButton onClick={onCancel}>{t('Cancel')}</SecondaryButton>
        <PrimaryButton onClick={onSubmit}>{t('Submit answers')}</PrimaryButton>
      </DialogFooter>
    </Dialog>
  )
}

export function ValidationScreen({
  state,
  send,
  validationStart,
  shortSessionDuration,
  longSessionDuration,
  isExceededTooltipOpen,
  onValidationFailed,
}) {
  const router = useRouter()

  const {t} = useTranslation()

  const [isPrettyHigh] = useMediaQuery('(min-height: 600px)')

  const {
    isOpen: isReportDialogOpen,
    onOpen: onOpenReportDialog,
    onClose: onCloseReportDialog,
  } = useDisclosure()

  const {
    currentIndex,
    translations,
    reportedFlipsCount,
    longFlips,
  } = state.context

  const flips = sessionFlips(state)
  const currentFlip = flips[currentIndex]

  return (
    <ValidationScene
      bg={isShortSession(state) ? theme.colors.black : theme.colors.white}
    >
      <Header isPrettyHigh={isPrettyHigh}>
        <Title color={isShortSession(state) ? 'white' : 'brandGray.500'}>
          {['shortSession', 'longSession'].some(state.matches) &&
          !isLongSessionKeywords(state)
            ? t('Select meaningful story: left or right', {nsSeparator: '!'})
            : t('Check flips quality')}
        </Title>
        <Flex align="center">
          <Title
            color={isShortSession(state) ? 'white' : 'brandGray.500'}
            mr={6}
          >
            {currentIndex + 1}{' '}
            <Text as="span" color="muted">
              {t('out of')} {flips.length}
            </Text>
          </Title>
        </Flex>
      </Header>
      <CurrentStep>
        <FlipChallenge>
          <Flex justify="center" align="center" position="relative">
            {currentFlip &&
              ((currentFlip.fetched && !currentFlip.decoded) ||
                currentFlip.failed) && (
                <FailedFlipAnnotation>
                  {t('No data available. Please skip the flip.')}
                </FailedFlipAnnotation>
              )}
            <Flip
              {...currentFlip}
              variant={AnswerType.Left}
              onChoose={hash =>
                send({
                  type: 'ANSWER',
                  hash,
                  option: AnswerType.Left,
                })
              }
            />
            <Flip
              {...currentFlip}
              variant={AnswerType.Right}
              onChoose={hash =>
                send({
                  type: 'ANSWER',
                  hash,
                  option: AnswerType.Right,
                })
              }
              onImageFail={() => send('REFETCH_FLIPS')}
            />
          </Flex>
          {isLongSessionKeywords(state) && currentFlip && (
            <FlipWords
              key={currentFlip.hash}
              currentFlip={currentFlip}
              translations={translations}
              isShowGtLink={isPrettyHigh}
            >
              <Stack spacing={4}>
                <Stack isInline spacing={1} align="center">
                  <Heading fontSize="base" fontWeight={500}>
                    {t(`Is the flip correct?`)}
                  </Heading>
                  <IconButton
                    icon={<InfoIcon />}
                    bg="unset"
                    fontSize={rem(20)}
                    minW={5}
                    w={5}
                    h={5}
                    _active={{
                      bg: 'unset',
                    }}
                    _hover={{
                      bg: 'unset',
                    }}
                    _focus={{
                      outline: 'none',
                    }}
                    onClick={onOpenReportDialog}
                  />
                </Stack>
                <QualificationActions>
                  <QualificationButton
                    isSelected={
                      currentFlip.relevance === RelevanceType.Relevant
                    }
                    onClick={() =>
                      send({
                        type: 'TOGGLE_WORDS',
                        hash: currentFlip.hash,
                        relevance: RelevanceType.Relevant,
                      })
                    }
                  >
                    {t('Both relevant')}
                  </QualificationButton>
                  <Tooltip
                    label={t(
                      'Please remove Report status from some other flips to continue'
                    )}
                    isOpen={isExceededTooltipOpen}
                    placement="top"
                    zIndex="tooltip"
                  >
                    <QualificationButton
                      isSelected={
                        currentFlip.relevance === RelevanceType.Irrelevant
                      }
                      bg={
                        currentFlip.relevance === RelevanceType.Irrelevant
                          ? 'red.500'
                          : 'red.012'
                      }
                      color={
                        currentFlip.relevance === RelevanceType.Irrelevant
                          ? 'white'
                          : 'red.500'
                      }
                      _hover={{
                        bg:
                          currentFlip.relevance === RelevanceType.Irrelevant
                            ? 'red.500'
                            : 'red.020',
                      }}
                      _active={{
                        bg:
                          currentFlip.relevance === RelevanceType.Irrelevant
                            ? 'red.500'
                            : 'red.020',
                      }}
                      _focus={{
                        boxShadow: '0 0 0 3px rgb(255 102 102 /0.50)',
                        outline: 'none',
                      }}
                      onClick={() =>
                        send({
                          type: 'TOGGLE_WORDS',
                          hash: currentFlip.hash,
                          relevance: RelevanceType.Irrelevant,
                        })
                      }
                    >
                      {t('Report')}{' '}
                      {t('({{count}} left)', {
                        count:
                          availableReportsNumber(longFlips) -
                          reportedFlipsCount,
                      })}
                    </QualificationButton>
                  </Tooltip>
                </QualificationActions>
              </Stack>
            </FlipWords>
          )}
        </FlipChallenge>
      </CurrentStep>
      <ActionBar>
        <ActionBarItem />
        <ActionBarItem justify="center">
          <ValidationTimer
            key={isShortSession(state) ? 'short-timer' : 'long-timer'}
            validationStart={validationStart}
            duration={
              shortSessionDuration -
              10 +
              (isShortSession(state) ? 0 : longSessionDuration)
            }
          />
        </ActionBarItem>
        <ActionBarItem justify="flex-end">
          {(isShortSession(state) || isLongSessionKeywords(state)) && (
            <TooltipLegacy
              content={
                hasAllRelevanceMarks(state) || isLastFlip(state)
                  ? null
                  : t('Go to last flip')
              }
            >
              <PrimaryButton
                isDisabled={!canSubmit(state)}
                isLoading={isSubmitting(state)}
                loadingText={t('Submitting answers...')}
                onClick={() => send('SUBMIT')}
              >
                {t('Submit answers')}
              </PrimaryButton>
            </TooltipLegacy>
          )}
          {isLongSessionFlips(state) && (
            <PrimaryButton
              isDisabled={!canSubmit(state)}
              onClick={() => send('FINISH_FLIPS')}
            >
              {t('Start checking keywords')}
            </PrimaryButton>
          )}
        </ActionBarItem>
      </ActionBar>
      <Thumbnails currentIndex={currentIndex}>
        {flips.map((flip, idx) => (
          <Thumbnail
            key={flip.hash}
            {...flip}
            isCurrent={currentIndex === idx}
            onPick={() => send({type: 'PICK', index: idx})}
          />
        ))}
      </Thumbnails>
      {!isFirstFlip(state) &&
        hasManyFlips(state) &&
        isSolving(state) &&
        !isSubmitting(state) && (
          <NavButton
            type="prev"
            bg={
              isShortSession(state) ? theme.colors.white01 : theme.colors.gray
            }
            color={
              isShortSession(state) ? theme.colors.white : theme.colors.text
            }
            onClick={() => send({type: 'PREV'})}
          />
        )}
      {!isLastFlip(state) &&
        hasManyFlips(state) &&
        isSolving(state) &&
        !isSubmitting(state) && (
          <NavButton
            type="next"
            bg={
              isShortSession(state) ? theme.colors.white01 : theme.colors.gray
            }
            color={
              isShortSession(state) ? theme.colors.white : theme.colors.text
            }
            onClick={() => send({type: 'NEXT'})}
          />
        )}
      {isSubmitFailed(state) && (
        <SubmitFailedDialog isOpen onSubmit={() => send('RETRY_SUBMIT')} />
      )}

      {state.matches('longSession.solve.answer.welcomeQualification') && (
        <WelcomeQualificationDialog
          isOpen
          onSubmit={() => send('START_LONG_SESSION')}
        />
      )}
      {state.matches('longSession.solve.answer.finishFlips') && (
        <WelcomeKeywordsQualificationDialog
          isOpen
          onSubmit={() => send('START_KEYWORDS_QUALIFICATION')}
        />
      )}

      {state.matches('validationFailed') && (
        <ValidationFailedDialog
          isOpen
          onSubmit={
            onValidationFailed
              ? () => onValidationFailed()
              : () => router.push('/home')
          }
        />
      )}

      <BadFlipDialog
        isOpen={
          isReportDialogOpen ||
          state.matches('longSession.solve.answer.finishFlips')
        }
        title={t('The flip is to be reported')}
        subtitle={t(
          `You'll get rewards for reported flips if they are are also reported by more than 50% of qualification committee.`
        )}
        onClose={() => {
          if (state.matches('longSession.solve.answer.finishFlips'))
            send('START_KEYWORDS_QUALIFICATION')
          else onCloseReportDialog()
        }}
      />

      <ReviewValidationDialog
        flips={filterSolvableFlips(flips)}
        reportedFlipsCount={reportedFlipsCount}
        availableReportsCount={availableReportsNumber(longFlips)}
        isOpen={state.matches('longSession.solve.answer.review')}
        isSubmitting={isSubmitting(state)}
        onSubmit={() => send('SUBMIT')}
        onMisingAnswers={() => {
          send({
            type: 'CHECK_FLIPS',
            index: flips.findIndex(({option = 0}) => option < 1),
          })
        }}
        onMisingReports={() => {
          send('CHECK_REPORTS')
        }}
        onCancel={() => {
          send('CANCEL')
        }}
      />

      <ReviewShortSessionDialog
        flips={filterSolvableFlips(flips)}
        isOpen={state.matches(
          'shortSession.solve.answer.submitShortSession.confirm'
        )}
        onSubmit={() => send('SUBMIT')}
        onClose={() => {
          send('CANCEL')
        }}
        onCancel={() => {
          send('CANCEL')
        }}
      />
    </ValidationScene>
  )
}

function isShortSession(state) {
  return state.matches('shortSession')
}

function isLongSessionFlips(state) {
  return ['flips', 'finishFlips']
    .map(substate => `longSession.solve.answer.${substate}`)
    .some(state.matches)
}

function isLongSessionKeywords(state) {
  return ['keywordsQualification', 'submitAnswers']
    .map(substate => `longSession.solve.answer.${substate}`)
    .some(state.matches)
}

function isSolving(state) {
  return ['shortSession', 'longSession'].some(state.matches)
}

function isSubmitting(state) {
  return [
    'shortSession.solve.answer.submitShortSession.submitHash',
    'longSession.solve.answer.finishFlips',
    'longSession.solve.answer.submitAnswers',
  ].some(state.matches)
}

function isSubmitFailed(state) {
  return [
    ['shortSession', 'submitShortSession'],
    ['longSession', 'submitAnswers'],
  ]
    .map(([state1, state2]) => `${state1}.solve.answer.${state2}.fail`)
    .some(state.matches)
}

function isFirstFlip(state) {
  return ['shortSession', 'longSession']
    .map(substate => `${substate}.solve.nav.firstFlip`)
    .some(state.matches)
}

function isLastFlip(state) {
  const {currentIndex} = state.context
  const flips = sessionFlips(state)
  return currentIndex === flips.length - 1
}

function hasManyFlips(state) {
  return sessionFlips(state).length > 1
}

function canSubmit(state) {
  if (isShortSession(state) || isLongSessionFlips(state))
    return (hasAllAnswers(state) || isLastFlip(state)) && !isSubmitting(state)

  if (isLongSessionKeywords(state))
    return (
      (hasAllRelevanceMarks(state) || isLastFlip(state)) && !isSubmitting(state)
    )
}

function sessionFlips(state) {
  const {
    context: {shortFlips, longFlips},
  } = state
  return isShortSession(state)
    ? rearrangeFlips(filterRegularFlips(shortFlips))
    : rearrangeFlips(
        longFlips.filter(({decoded, missing}) => decoded || !missing)
      )
}

function hasAllAnswers(state) {
  const {
    context: {shortFlips, longFlips},
  } = state
  const flips = isShortSession(state)
    ? shortFlips.filter(({decoded, extra}) => decoded && !extra)
    : longFlips.filter(({decoded}) => decoded)
  return flips.length && flips.every(({option}) => option)
}

function hasAllRelevanceMarks({context: {longFlips}}) {
  const flips = longFlips.filter(decodedWithKeywords)
  return flips.every(({relevance}) => relevance)
}
