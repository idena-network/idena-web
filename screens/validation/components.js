/* eslint-disable no-shadow */
/* eslint-disable react/prop-types */
import React, {useEffect, useMemo, useRef, useState} from 'react'
import {margin, borderRadius, cover, transparentize, rgba} from 'polished'
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
  Divider,
  Button,
  ListItem,
  AspectRatio,
  Image,
  List,
  Modal,
  ModalOverlay,
  ModalContent,
  useDisclosure,
  useBreakpointValue,
  useMediaQuery,
  ModalBody,
} from '@chakra-ui/react'
import {useSwipeable} from 'react-swipeable'
import {useMachine} from '@xstate/react'
import {Trans, useTranslation} from 'react-i18next'
import dayjs from 'dayjs'
import {useRouter} from 'next/router'
import {State} from 'xstate'
import useHover from '@react-hook/hover'
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
  DrawerFooter,
  Drawer,
  DrawerBody,
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
  EmptyFlipImage,
  FlipKeywordPanelNew,
  FlipKeywordTranslationSwitchNew,
} from '../flips/components'

import {
  CornerButton,
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
  OkIcon,
  ArrowBackIcon,
  ZoomFlipIcon,
  CrossSmallIcon,
} from '../../shared/components/icons'
import {TEST_SHORT_SESSION_INTERVAL_SEC} from '../../shared/providers/test-validation-context'
import {use100vh} from '../../shared/hooks/use-100vh'
import {useIsDesktop} from '../../shared/utils/utils'

const Scroll = require('react-scroll')

const {ScrollElement} = Scroll
const {scroller} = Scroll
const ElementThumbnail = ScrollElement(Thumbnail)
const ElementFlipImage = ScrollElement(AspectRatio)

export function ValidationScene(props) {
  return (
    <ChakraFlex
      direction="column"
      h={['100%', '100vh']}
      maxW="full"
      overflowY={['auto', 'initial']}
      sx={{
        '&::-webkit-scrollbar': {
          display: 'none',
        },
      }}
      pt={6}
      pb={[0, 3]}
      pl={[0, 10]}
      pr={[0, 6]}
      overflow="hidden"
      {...props}
    />
  )
}

export function Header(props) {
  return (
    <ChakraFlex
      position={['fixed', 'initial']}
      top={['24px', 'initial']}
      left={[0, 'initial']}
      h={['60px', 'auto']}
      w={['100%', 'auto']}
      direction={['column', 'row']}
      justify={['space-evenly', 'space-between']}
      align="center"
      mb={['15px', '55px']}
      zIndex={[2, 'initial']}
      {...props}
    />
  )
}

export function Title(props) {
  return (
    <Heading
      fontSize={['mdx', '24px']}
      lineHeight="short"
      fontWeight={[400, 500]}
      {...props}
    />
  )
}

export function CurrentStep(props) {
  return (
    <ChakraFlex
      justify="center"
      flex={1}
      mt={['154px', 0]}
      px={[8, 0]}
      mb={[0, 6]}
      {...props}
    />
  )
}

export function FlipChallenge(props) {
  return (
    <ChakraFlex
      w={['100%', 'auto']}
      direction={['column', 'row']}
      justify={['flex-start', 'center']}
      align="center"
      css={{zIndex: 1}}
      {...props}
    />
  )
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
  timerDetails,
  onChoose,
  onImageFail,
  isTrainingValidation,
}) {
  const radius = useBreakpointValue(['12px', '8px'])
  const windowHeight = use100vh()
  const isDesktop = useIsDesktop()
  const refFlipHover = useRef(null)
  const refZoomIconHover = useRef(null)
  const isFlipHovered = useHover(refFlipHover.current)
  const isZoomIconHovered = useHover(refZoomIconHover.current)
  const {
    isOpen: isOpenFlipZoom,
    onOpen: onOpenFlipZoom,
    onClose: onCloseFlipZoom,
  } = useDisclosure()

  const scrollToZoomedFlip = flipId => {
    scroller.scrollTo(`flipId-${flipId}`, {
      duration: 250,
      smooth: true,
      containerId: 'zoomedFlips',
      horizontal: false,
      offset: -80,
    })
  }
  const onFLipClick = useSingleAndDoubleClick(
    () => onChoose(hash),
    onOpenFlipZoom
  )

  if ((fetched && !decoded) || failed) return <FailedFlip />
  if (!fetched) return <LoadingFlip />

  return (
    <div ref={refFlipHover}>
      <FlipHolder
        isZoomHovered={isZoomIconHovered}
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
                  transition: 'all .05s cubic-bezier(.5, 0, .5, 1)',
                }
              : {
                  opacity: 0.3,
                  transform: 'scale(0.98)',
                  transition: 'all .05s cubic-bezier(.5, 0, .5, 1)',
                }
            : {}
        }
      >
        {reorderList(images, orders[variant - 1]).map((src, idx) => (
          <ChakraBox
            key={idx}
            h={[
              `calc((${windowHeight}px - 290px) / 4)`,
              'calc((100vh - 260px) / 4)',
            ]}
            borderRadius={getFlipBorderRadius(idx, images.length - 1, radius)}
            css={{
              // height: 'calc((100vh - 260px) / 4)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={
              isDesktop
                ? () => {
                    onFLipClick()
                    setTimeout(() => scrollToZoomedFlip(idx), 100)
                  }
                : () => onChoose(hash)
            }
          >
            {isDesktop && idx === 0 && (
              <div ref={refZoomIconHover}>
                <ChakraFlex
                  display={isFlipHovered ? 'flex' : 'none'}
                  align="center"
                  justify="center"
                  borderRadius="8px"
                  backgroundColor="rgba(17, 17, 17, 0.5)"
                  position="absolute"
                  top={1}
                  right={1}
                  h={8}
                  w={8}
                  opacity={0.5}
                  _hover={{opacity: 1}}
                  zIndex={2}
                  onClick={e => {
                    e.stopPropagation()
                    onOpenFlipZoom()
                  }}
                >
                  <ZoomFlipIcon h={5} w={5} />
                </ChakraFlex>
              </div>
            )}
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
          </ChakraBox>
        ))}

        <Modal size="xl" isOpen={isOpenFlipZoom} onClose={onCloseFlipZoom}>
          <ModalOverlay />
          <ChakraFlex
            zIndex={1401}
            position="fixed"
            top={0}
            left={0}
            right={0}
            h={20}
            justify="space-between"
            align="center"
            backgroundColor="gray.980"
          >
            <ChakraBox />
            <ChakraFlex zIndex={2} justify="center">
              <ValidationTimer
                key={
                  isShortSession(timerDetails.state)
                    ? 'short-timer'
                    : 'long-timer'
                }
                validationStart={timerDetails.validationStart}
                duration={
                  timerDetails.shortSessionDuration -
                  (isTrainingValidation ? 0 : 10) +
                  (isShortSession(timerDetails.state)
                    ? 0
                    : timerDetails.longSessionDuration)
                }
                color="white"
              />
            </ChakraFlex>
            <CrossSmallIcon
              color="white"
              boxSize={8}
              mr={10}
              onClick={onCloseFlipZoom}
            />
          </ChakraFlex>
          <ModalContent
            mt={20}
            bg="transparent"
            border="none"
            boxShadow="none"
            containerProps={{id: 'zoomedFlips'}}
          >
            <ModalBody py={0}>
              <ChakraFlex h="100%" w="100%" direction="column" align="center">
                <ChakraBox w="100%">
                  {reorderList(images, orders[variant - 1]).map((src, idx) => (
                    <ElementFlipImage
                      name={`flipId-${idx}`}
                      ratio={4 / 3}
                      bg="gray.50"
                    >
                      {src ? (
                        <ChakraBox position="relative">
                          <ChakraBox
                            style={{
                              background: `center center / cover no-repeat url(${src})`,
                              filter: `blur(${rem(24)})`,
                              ...cover(),
                              zIndex: 1,
                            }}
                          />
                          <FlipImage
                            src={src}
                            alt="current-flip"
                            height="100%"
                            width="100%"
                            style={{
                              position: 'relative',
                              zIndex: 1,
                            }}
                            onError={onImageFail}
                          />
                        </ChakraBox>
                      ) : (
                        <EmptyFlipImage />
                      )}
                    </ElementFlipImage>
                  ))}
                </ChakraBox>
              </ChakraFlex>
            </ModalBody>
          </ModalContent>
        </Modal>
      </FlipHolder>
    </div>
  )
}

function FlipHolder({css, isZoomHovered = false, ...props}) {
  const windowHeight = use100vh()
  return (
    <Tooltip
      isOpen={isZoomHovered}
      label="Doubleclick to zoom"
      placement="top"
      zIndex="tooltip"
      bg="graphite.500"
    >
      <ChakraFlex
        justify="center"
        direction="column"
        position="relative"
        h={[`calc(${windowHeight}px - 290px)`, 'calc(100vh - 260px)']}
        w={['100%', 'calc((100vh - 240px) / 3)']}
        mx={['6px', '10px']}
        my={0}
        p={1}
        borderRadius={['16px', '8px']}
        border={`solid ${rem(2)} ${transparentize(
          0.95,
          theme.colors.primary2
        )}`}
        boxShadow={`0 0 ${rem(2)} 0 ${transparentize(
          0.95,
          theme.colors.primary2
        )}`}
        css={css}
        {...props}
      />
    </Tooltip>
  )
}

function LoadingFlip() {
  const windowHeight = use100vh()
  return (
    <FlipHolder css={{cursor: 'not-allowed'}}>
      <Fill h={[`calc(${windowHeight}px - 290px)`, 'auto']} w="100%">
        <ValidationSpinner />
      </Fill>
    </FlipHolder>
  )
}

const defaultOrder = [1, 2, 3, 4]

function FailedFlip() {
  const {t} = useTranslation()
  const radius = useBreakpointValue(['12px', '8px'])
  const windowHeight = use100vh()
  return (
    <FlipHolder
      css={{
        border: 'none',
        boxShadow: 'none',
        cursor: 'not-allowed',
      }}
    >
      {defaultOrder.map((_, idx) => (
        <ChakraFlex
          key={`left-${idx}`}
          justify="center"
          align="center"
          borderRadius={getFlipBorderRadius(
            idx,
            defaultOrder.length - 1,
            radius
          )}
          h={[
            `calc((${windowHeight}px - 290px) / 4)`,
            'calc((100vh - 260px) / 4)',
          ]}
          css={{
            background: transparentize(0.16, theme.colors.gray5),
            border: 'solid 1px rgba(210, 212, 217, 0.16)',
            borderBottom:
              idx !== defaultOrder.length - 1
                ? 'none'
                : 'solid 1px rgba(210, 212, 217, 0.16)',
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
        </ChakraFlex>
      ))}
    </FlipHolder>
  )
}

export function FailedFlipAnnotation(props) {
  return (
    <ChakraBox
      background="gray.980"
      color="xwhite.500"
      fontSize="md"
      fontWeight={500}
      textAlign="center"
      transform="translateY(-50%)"
      p="16px 42px"
      position="absolute"
      top="50%"
      left={['10px', '14px']}
      right={['10px', '14px']}
      zIndex={2}
      {...props}
    />
  )
}

function FlipBlur({src, ...props}) {
  return (
    <ChakraBox
      style={{
        background: `center center / cover no-repeat url(${src})`,
        filter: `blur(${rem(6)})`,
        ...cover(),
        zIndex: 1,
      }}
      {...props}
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
    <ChakraFlex
      position={['fixed', 'initial']}
      bottom={[0, 'initial']}
      left={[0, 'initial']}
      w={['100%', 'auto']}
      justify="space-between"
      mt={[6, 0]}
      mb={[10, 4]}
      zIndex={[1, 'initial']}
      {...props}
    />
  )
}

export function ActionBarItem(props) {
  return <ChakraFlex flex={1} minH="32px" zIndex={1} {...props} />
}

const totalThumbWidth = 44

export function Thumbnails({currentIndex, isLong, ...props}) {
  return (
    <ChakraFlex
      position={['fixed', 'initial']}
      top={['100px', 'initial']}
      left={[0, 'initial']}
      w={['100%', 'auto']}
      mx={[isLong ? '32px' : 0, 0]}
      maxW={['-webkit-fill-available', 'auto']}
      align="center"
      justify={[isLong ? 'normal' : 'center', 'normal']}
      minH={12}
      overflowX={['scroll', 'auto']}
      sx={{
        '&::-webkit-scrollbar': {
          display: 'none',
        },
      }}
      transform={[
        'none',
        `translateX(50%) translateX(-${rem(
          totalThumbWidth * (currentIndex + 1 / 2)
        )})`,
      ]}
      transition={['none', 'transform .3s ease-out']}
      willChange={['none', 'transform']}
      zIndex={1}
      {...props}
    />
  )
}

export function Thumbnail({
  flipId,
  images,
  fetched,
  decoded,
  failed,
  option,
  relevance,
  isCurrent,
  isLong,
  onPick,
}) {
  const isQualified = !!relevance
  const hasIrrelevantWords = relevance === RelevanceType.Irrelevant
  const flipPreviewSize = useBreakpointValue(['100%', 32])
  const flipPreviewBorderRadius = useBreakpointValue(['16px', '12px'])

  return (
    <ThumbnailHolder
      name={flipId}
      isCurrent={isCurrent}
      isLong={isLong}
      border={[
        `solid 1px ${
          // eslint-disable-next-line no-nested-ternary
          isCurrent
            ? // eslint-disable-next-line no-nested-ternary
              isQualified
              ? hasIrrelevantWords
                ? theme.colors.danger
                : 'white'
              : 'white'
            : 'transparent'
        }`,
        `solid 2px ${
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
      ]}
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
            height={flipPreviewSize}
            width={flipPreviewSize}
            fit="cover"
            style={{
              borderRadius: flipPreviewBorderRadius,
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

function ThumbnailHolder({isCurrent, isLong, children, ...props}) {
  const currentColor = isLong ? 'gray.500' : 'xwhite.500'

  return (
    <ChakraFlex
      justify="center"
      align="center"
      border={['solid 1px', 'solid 2px']}
      borderColor={[
        isCurrent ? currentColor : 'transparent',
        isCurrent ? theme.colors.primary : 'transparent',
      ]}
      borderRadius={['18px', '12px']}
      {...props}
    >
      <ChakraBox
        position="relative"
        h={['44px', '32px']}
        w={['44px', '32px']}
        m={[0.5, 1]}
      >
        {children}
      </ChakraBox>
    </ChakraFlex>
  )
}

function LoadingThumbnail() {
  return <ValidationSpinner size={24} />
}

function FailedThumbnail() {
  return (
    <Fill
      bg={rgba(89, 89, 89, 0.95)}
      borderRadius={['16px', '12px']}
      css={{
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
      borderRadius={['16px', '12px']}
    >
      {option && <FiCheck size={rem(20)} color={theme.colors.white} />}
    </Fill>
  )
}

export function FlipWords({
  currentFlip: {words = []},
  translations = {},
  onReport = {},
  children,
  ...props
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
    <ChakraFlex
      direction="column"
      fontSize={['base', 'md']}
      color="brandGray.500"
      ml={[0, 8]}
      mb={[10, 0]}
      w={['100%', '320px']}
      {...props}
    >
      <ChakraFlex
        display={['flex', 'none']}
        direction="row"
        align="center"
        justify="center"
      >
        <Heading fontSize="20px" fontWeight={500}>
          {t(`Is the flip correct?`)}
        </Heading>
        <IconButton
          icon={<InfoIcon />}
          bg="unset"
          fontSize="20px"
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
          onClick={onReport}
        />
      </ChakraFlex>
      <FlipKeywordPanelNew mb={8}>
        {words.length ? (
          <FlipKeywordTranslationSwitchNew
            keywords={{
              words,
              translations: wordTranslations.map(x => (x ? [x] : [])),
            }}
            showTranslation={shouldShowTranslation}
            locale={i18n.language}
            onSwitchLocale={() => setShowTranslation(!showTranslation)}
            isInline={false}
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
      </FlipKeywordPanelNew>
      {children}
    </ChakraFlex>
  )
}

export function QualificationActions(props) {
  return (
    <ChakraFlex
      direction={['column', 'row']}
      justify="center"
      align="center"
      {...props}
    />
  )
}

// eslint-disable-next-line react/display-name
export const QualificationButton = React.forwardRef(
  ({isSelected, size, children, ...props}, ref) => {
    const ButtonVariant = isSelected ? PrimaryButton : SecondaryButton
    return (
      <ButtonVariant
        size={size}
        ref={ref}
        flex={['0 0 48px', 1]}
        w={['100%', 'auto']}
        maxW={['100%', 40]}
        {...props}
      >
        <Stack isInline spacing={2} align="center" justify="center">
          {isSelected && <TickIcon boxSize={5} />}
          <Text fontWeight={[500, 400]}>{children}</Text>
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

export function ValidationTimer({validationStart, duration, color}) {
  const adjustedDuration = useMemo(
    () => adjustDuration(validationStart, duration),
    [duration, validationStart]
  )

  return (
    <Timer>
      <TimerIcon color={theme.colors.danger} mr={1} />
      <TimerClock
        duration={adjustedDuration}
        color={color || theme.colors.danger}
      />
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
      <Text color={color} fontSize={['16px', '13px']} fontWeight={500}>
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

function ValidationDialog({
  submitText,
  onSubmit,
  children,
  isDesktop,
  ...props
}) {
  return (
    <Dialog
      closeOnOverlayClick={false}
      closeOnEsc={false}
      isDesktop={isDesktop}
      isCloseable={false}
      {...props}
    >
      {children}
      {onSubmit && (
        <ValidationDialogFooter
          submitText={submitText}
          isDesktop={isDesktop}
          onSubmit={onSubmit}
        />
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

function ValidationDialogFooter({submitText, onSubmit, isDesktop, props}) {
  const NoticeFooter = isDesktop ? DialogFooter : DrawerFooter
  const size = useBreakpointValue(['mdx', 'md'])
  const variantPrimary = useBreakpointValue(['primaryFlat', 'primary'])
  return (
    <NoticeFooter {...props}>
      <Button
        variant={variantPrimary}
        size={size}
        w={['100%', 'auto']}
        onClick={onSubmit}
      >
        {submitText}
      </Button>
    </NoticeFooter>
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
  isDesktop,
  ...props
}) {
  const {t} = useTranslation()

  const answeredFlipsCount = flips.filter(({option}) => option > 0).length

  const areFlipsUnanswered = answeredFlipsCount < flips.length
  const areReportsMissing = reportedFlipsCount < availableReportsCount

  const NoticeFooter = isDesktop ? DialogFooter : DrawerFooter
  const size = useBreakpointValue(['mdx', 'md'])
  const variantPrimary = useBreakpointValue(['primaryFlat', 'primary'])
  const variantSecondary = useBreakpointValue(['secondaryFlat', 'secondary'])

  return (
    <Dialog
      title={t('Submit the answers')}
      onClose={onCancel}
      isDesktop={isDesktop}
      isCloseable={false}
      {...props}
    >
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
      <NoticeFooter {...props}>
        <Button
          variant={variantSecondary}
          size={size}
          w={['100%', 'auto']}
          onClick={onCancel}
        >
          {t('Cancel')}
        </Button>
        <Divider
          display={['block', 'none']}
          h={10}
          orientation="vertical"
          color="gray.100"
        />
        <Button
          variant={variantPrimary}
          size={size}
          w={['100%', 'auto']}
          isLoading={isSubmitting}
          loadingText={t('Submitting answers...')}
          onClick={onSubmit}
        >
          {isDesktop ? t('Submit answers') : t('Submit')}
        </Button>
      </NoticeFooter>
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
      fontSize={['mobile', 'md']}
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

  const isMobile = useBreakpointValue([true, false])
  const BadFlipNotice = isMobile ? Drawer : Modal
  const BadFlipNoticeBody = isMobile ? DrawerBody : ModalContent

  const badFlipDialogHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (isMobile) {
        setFlipCase(flipCase === 4 ? flipCase : flipCase + 1)
      }
    },
    onSwipedRight: () => {
      if (isMobile) {
        setFlipCase(flipCase === 0 ? flipCase : flipCase - 1)
      }
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  })

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
    <BadFlipNotice
      isOpen={isOpen}
      isCentered
      isCloseable={false}
      initialFocusRef={nextButtonRef}
      size={['full', 664]}
      onClose={onClose}
      {...props}
    >
      <ModalOverlay display={['none', 'block']} bg="xblack.080" />
      <BadFlipNoticeBody
        className="block-swipe-nav"
        display={['flex', 'block']}
        flexDirection="column"
        bg="transparent"
        color="brandGray.500"
        fontSize="md"
        rounded={['none', 'lg']}
        w="auto"
      >
        <ChakraFlex display={['initial', 'none']} textAlign="center" w="100%">
          <Text fontSize="base" fontWeight="bold" mb={9}>
            What is a bad flip?
          </Text>
          <Button
            position="absolute"
            top="14px"
            right={4}
            p={0}
            fontSize="base"
            fontWeight="normal"
            variant="primaryFlat"
            onClick={onClose}
          >
            {t('Done')}
          </Button>
        </ChakraFlex>
        <div
          style={{display: 'flex', flexGrow: '1'}}
          {...badFlipDialogHandlers}
        >
          <ChakraFlex
            direction={['column', 'row']}
            justify="center"
            align="center"
            flexGrow={1}
          >
            <Stack
              spacing={0}
              borderColor="brandGray.016"
              borderWidth={[0, 1]}
              flexGrow={1}
              h="100%"
              minW={['42%', 120]}
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
              ml={[0, 7]}
              p={[0, 8]}
              w={['100%', 440]}
            >
              <Stack mt={[4, 0]} spacing={[5, 4]}>
                <ChakraBox display={['none', 'block']}>
                  <Heading fontSize="lg" fontWeight={500} lineHeight="32px">
                    {title}
                  </Heading>
                  <Text color="muted">{subtitle}</Text>
                </ChakraBox>
                <List
                  as="ul"
                  id="bad-flips"
                  p={['28px', 0]}
                  borderRadius={['8px', 0]}
                  backgroundColor={['gray.50', 'transparent']}
                >
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
                    {t(
                      'One of the keywords is not clearly visible in the story'
                    )}
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
                <ChakraFlex
                  display={['flex', 'none']}
                  justify="center"
                  h={12}
                  w="100%"
                >
                  <BadFlipListItemMobile
                    isActive={flipCase === 0}
                    number={1}
                    onClick={() => {
                      setFlipCase(0)
                    }}
                  />
                  <BadFlipListItemMobile
                    isActive={flipCase === 1}
                    number={2}
                    onClick={() => {
                      setFlipCase(1)
                    }}
                  />
                  <BadFlipListItemMobile
                    isActive={flipCase === 2}
                    number={3}
                    onClick={() => {
                      setFlipCase(2)
                    }}
                  />
                  <BadFlipListItemMobile
                    isActive={flipCase === 3}
                    number={4}
                    onClick={() => {
                      setFlipCase(3)
                    }}
                  />
                  <BadFlipListItemMobile
                    isActive={flipCase === 4}
                    number={5}
                    onClick={() => {
                      setFlipCase(4)
                    }}
                  />
                </ChakraFlex>
              </Stack>
              <Stack display={['none', 'flex']} isInline justify="flex-end">
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
          </ChakraFlex>
        </div>
      </BadFlipNoticeBody>
    </BadFlipNotice>
  )
}

function BadFlipImage(props) {
  return (
    <AspectRatio
      ratio={4 / 3}
      h={['50px', '100px']}
      display="flex"
      flexGrow="0.25"
    >
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
    <ListItem
      display={[isActive ? 'list-item' : 'none', 'list-item']}
      name={`badFlip${flipCase}`}
      py={2}
      cursor="pointer"
      {...props}
    >
      <Stack isInline spacing={[0, 2]}>
        <BadFlipListItemCircle
          display={['none', 'flex']}
          bg={isActive ? 'red.500' : 'red.012'}
          color={isActive ? 'white' : 'red.500'}
        >
          {flipCase + 1}
        </BadFlipListItemCircle>
        <Stack spacing={1}>
          <Text fontSize={['lg', 'md']} fontWeight={['500', 'normal']}>
            {children}
          </Text>
          {isActive && description && (
            <Text color="muted" fontSize={['mdx', '12px']}>
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

function BadFlipListItemMobile({isActive, number, ...props}) {
  return (
    <ChakraBox
      borderRadius="18px"
      border="1px solid"
      borderColor={isActive ? 'red.012' : 'transparent'}
      p="2px"
      w={12}
      {...props}
    >
      <ChakraFlex
        justify="center"
        align="center"
        borderRadius="16px"
        bg={isActive ? 'red.012' : 'gray.212'}
        h="100%"
        w="100%"
      >
        <BadFlipListItemCircle
          bg={isActive ? 'red.500' : 'gray.200'}
          color="white"
        >
          {number}
        </BadFlipListItemCircle>
      </ChakraFlex>
    </ChakraBox>
  )
}

function BadFlipPartFrame({flipCase, ...props}) {
  const topH = useBreakpointValue(['calc(25% - 4px)', `${100 * 1 - 4}px`])
  const botH = useBreakpointValue(['calc(50% - 4px)', `${100 * 2 - 4}px`])
  const framePosition = [
    {},
    {},
    {},
    {top: topH, bottom: botH},
    {top: topH, bottom: botH},
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

function ReviewShortSessionDialog({
  flips,
  onSubmit,
  onCancel,
  isDesktop,
  ...props
}) {
  const {t} = useTranslation()

  const answeredFlipsCount = flips.filter(({option}) => option > 0).length

  const areFlipsUnanswered = answeredFlipsCount < flips.length

  const NoticeFooter = isDesktop ? DialogFooter : DrawerFooter
  const size = useBreakpointValue(['mdx', 'md'])
  const variantPrimary = useBreakpointValue(['primaryFlat', 'primary'])
  const variantSecondary = useBreakpointValue(['secondaryFlat', 'secondary'])

  return (
    <Dialog
      title={t('Submit the answers')}
      onClose={onCancel}
      isDesktop={isDesktop}
      isCloseable={false}
      {...props}
    >
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
      <NoticeFooter justify={['center', 'auto']} {...props}>
        <Button
          variant={variantSecondary}
          size={size}
          w={['100%', 'auto']}
          onClick={onCancel}
        >
          {t('Cancel')}
        </Button>
        <Divider
          display={['block', 'none']}
          h={10}
          orientation="vertical"
          color="gray.100"
        />
        <Button
          variant={variantPrimary}
          size={size}
          w={['100%', 'auto']}
          onClick={onSubmit}
        >
          {isDesktop ? t('Submit answers') : t('Submit')}
        </Button>
      </NoticeFooter>
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

  const preventSwipeBack = event => {
    event.preventDefault()
  }
  useEffect(() => {
    const element = document.querySelector('.block-swipe-nav')
    element.addEventListener('touchstart', preventSwipeBack)
    return () => element.removeEventListener('touchstart', preventSwipeBack)
  }, [])

  const {t} = useTranslation()

  const [isDesktop] = useMediaQuery('(min-width: 481px)')
  const size = useBreakpointValue(['lg', 'md'])
  const flipsToLeft = () => {
    scroller.scrollTo('flipIcon0', {
      duration: 250,
      smooth: true,
      containerId: 'thumbnails',
      horizontal: true,
    })
  }

  const {
    isOpen: isReportDialogOpen,
    onOpen: onOpenReportDialog,
    onClose: onCloseReportDialog,
  } = useDisclosure()

  const {
    isOpen: isReportTipOpen,
    onOpen: onOpenReportTip,
    onClose: onCloseReportTip,
  } = useDisclosure()

  const {
    currentIndex,
    translations,
    reportedFlipsCount,
    longFlips,
    isTraining,
  } = state.context

  const flips = sessionFlips(state)
  const currentFlip = flips[currentIndex]

  const scrollToCurrentFlip = flipId => {
    scroller.scrollTo(`flipIcon${flipId}`, {
      duration: 250,
      smooth: true,
      containerId: 'thumbnails',
      horizontal: true,
    })
  }

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isDesktop) {
        send({type: 'NEXT'})
        scrollToCurrentFlip(currentIndex + 1)
      }
    },
    onSwipedRight: () => {
      if (!isDesktop) {
        send({type: 'PREV'})
        scrollToCurrentFlip(currentIndex - 1)
      }
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  })

  const flipTimerDetails = {
    state,
    validationStart,
    shortSessionDuration,
    longSessionDuration,
  }

  return (
    <ValidationScene
      bg={isShortSession(state) ? theme.colors.black : theme.colors.white}
    >
      <Header order={[1, 1]}>
        <Heading
          display={['block', 'none']}
          color={isShortSession(state) ? 'white' : 'brandGray.500'}
          fontSize="base"
          zIndex={[2, 'auto']}
        >
          {isLongSessionKeywords(state)
            ? t('Check flips quality')
            : t('Left or right')}
        </Heading>
        <Title
          color={['muted', isShortSession(state) ? 'white' : 'brandGray.500']}
          zIndex={[2, 'auto']}
        >
          {/* eslint-disable-next-line no-nested-ternary */}
          {['shortSession', 'longSession'].some(state.matches) &&
          !isLongSessionKeywords(state)
            ? isDesktop
              ? t('Select meaningful story: left or right', {nsSeparator: '!'})
              : t('Select meaningful story:', {nsSeparator: '!'})
            : isDesktop
            ? t('Check flips quality')
            : ''}
        </Title>
        <Flex align="center">
          <Title
            color={['muted', isShortSession(state) ? 'white' : 'brandGray.500']}
            mr={[0, 6]}
            zIndex={[2, 'auto']}
          >
            {!isDesktop && !isLongSessionKeywords(state) && 'left or right ('}
            {currentIndex + 1}{' '}
            <Text as="span" color="muted">
              {t('out of')} {flips.length}
            </Text>
            {!isDesktop && !isLongSessionKeywords(state) && ')'}
          </Title>
        </Flex>
      </Header>
      <ChakraBox order={[3, 2]} {...handlers}>
        <ChakraBox
          display={['block', 'none']}
          className="block-swipe-nav"
          position="absolute"
          left={0}
          w="32px"
          h="100%"
        />
        <CurrentStep>
          <FlipChallenge>
            <ChakraFlex
              order={[2, 1]}
              w={['100%', 'auto']}
              pb={[isLongSessionKeywords(state) ? '96px' : '16px', 0]}
              justify="center"
              align="center"
              position="relative"
            >
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
                timerDetails={flipTimerDetails}
                onChoose={hash =>
                  send({
                    type: 'ANSWER',
                    hash,
                    option: AnswerType.Left,
                  })
                }
                isTrainingValidation={isTraining}
              />
              <Flip
                {...currentFlip}
                variant={AnswerType.Right}
                timerDetails={flipTimerDetails}
                onChoose={hash =>
                  send({
                    type: 'ANSWER',
                    hash,
                    option: AnswerType.Right,
                  })
                }
                onImageFail={() => send('REFETCH_FLIPS')}
                isTrainingValidation={isTraining}
              />
            </ChakraFlex>
            {isLongSessionKeywords(state) && currentFlip && (
              <FlipWords
                order={[1, 2]}
                key={currentFlip.hash}
                currentFlip={currentFlip}
                translations={translations}
                onReport={onOpenReportDialog}
              >
                <Stack spacing={[0, 4]}>
                  <Stack
                    display={['none', 'flex']}
                    isInline
                    spacing={1}
                    align="center"
                  >
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
                      size={size}
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
                        mt={[2, 0]}
                        ml={[0, 2]}
                        size={size}
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
      </ChakraBox>
      <ActionBar order={[4, 3]}>
        <ActionBarItem />
        <ActionBarItem zIndex={2} justify="center">
          <ValidationTimer
            key={isShortSession(state) ? 'short-timer' : 'long-timer'}
            validationStart={validationStart}
            duration={
              shortSessionDuration -
              (isTraining ? 0 : 10) +
              (isShortSession(state) ? 0 : longSessionDuration)
            }
          />
        </ActionBarItem>
        <ActionBarItem justify="flex-end">
          <ChakraBox
            display={['block', 'none']}
            position="fixed"
            top={0}
            h="166px"
            w="100%"
            bg={isShortSession(state) ? theme.colors.black : theme.colors.white}
          />
          <ChakraBox
            display={['block', 'none']}
            position="fixed"
            bottom={0}
            h="96px"
            w="100%"
            bg={isShortSession(state) ? theme.colors.black : theme.colors.white}
          />
          {(isShortSession(state) || isLongSessionKeywords(state)) && (
            <TooltipLegacy
              content={
                hasAllRelevanceMarks(state) || isLastFlip(state) || !isDesktop
                  ? null
                  : t('Go to last flip')
              }
            >
              <PrimaryButton
                display={['none', 'inline-flex']}
                isDisabled={!canSubmit(state)}
                isLoading={isSubmitting(state)}
                loadingText={t('Submitting answers...')}
                onClick={() => send('SUBMIT')}
              >
                {t('Submit answers')}
              </PrimaryButton>
              <CornerButton
                display={['block', 'none']}
                label={t('Submit')}
                isDisabled={!canSubmit(state)}
                isLoading={isSubmitting(state)}
                isDark={isShortSession(state)}
                onClick={() => send('SUBMIT')}
              >
                <OkIcon
                  color={canSubmit(state) ? 'brandBlue.500' : 'inherit'}
                  mb="5px"
                  boxSize={5}
                />
              </CornerButton>
            </TooltipLegacy>
          )}
          {isLongSessionFlips(state) && (
            <ChakraBox>
              <PrimaryButton
                display={['none', 'inline-flex']}
                isDisabled={!canSubmit(state)}
                onClick={() => {
                  onOpenReportTip()
                  send('FINISH_FLIPS')
                }}
              >
                {t('Start checking keywords')}
              </PrimaryButton>
              <CornerButton
                display={['block', 'none']}
                label={t('Check')}
                isDisabled={!canSubmit(state)}
                isDark={isShortSession(state)}
                onClick={() => {
                  onOpenReportTip()
                  send('FINISH_FLIPS')
                }}
              >
                <ArrowBackIcon
                  fill={canSubmit(state) ? 'brandBlue.500' : 'gray.200'}
                  transform="rotate(180deg)"
                  mb="5px"
                  boxSize={5}
                />
              </CornerButton>
            </ChakraBox>
          )}
        </ActionBarItem>
      </ActionBar>
      <Thumbnails
        id="thumbnails"
        order={[2, 4]}
        currentIndex={currentIndex}
        isLong={isLongSessionFlips(state) || isLongSessionKeywords(state)}
      >
        {flips.map((flip, idx) => (
          <ElementThumbnail
            flipId={`flipIcon${idx}`}
            key={flip.hash}
            {...flip}
            isCurrent={currentIndex === idx}
            isLong={isLongSessionFlips(state) || isLongSessionKeywords(state)}
            onPick={() => send({type: 'PICK', index: idx})}
          />
        ))}
      </Thumbnails>
      {!isFirstFlip(state) &&
        hasManyFlips(state) &&
        isSolving(state) &&
        !isSubmitting(state) && (
          <NavButton
            display={['none', 'block']}
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
            display={['none', 'block']}
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
        <SubmitFailedDialog
          isOpen
          isDesktop={isDesktop}
          onSubmit={() => send('RETRY_SUBMIT')}
        />
      )}

      {state.matches('longSession.solve.answer.welcomeQualification') && (
        <WelcomeQualificationDialog
          isOpen
          isDesktop={isDesktop}
          onSubmit={() => send('START_LONG_SESSION')}
        />
      )}

      {state.matches('validationFailed') && (
        <ValidationFailedDialog
          isOpen
          isDesktop={isDesktop}
          onSubmit={
            onValidationFailed
              ? () => onValidationFailed()
              : () => router.push('/home')
          }
        />
      )}

      <Dialog
        isOpen={!isDesktop && isReportTipOpen}
        title="Earn rewards for reporting"
        variant="primaryMobile"
        onClose={onCloseReportTip}
      >
        <DrawerBody>
          <ChakraFlex direction="column">
            <Text fontSize="base" color="muted">
              {t(
                'Report bad flips and get rewarded if these flips are reported by more that 50% of other participants.'
              )}
            </Text>
            <Button
              onClick={onCloseReportTip}
              fontSize="mobile"
              fontWeight={500}
              mt={4}
              h={10}
              variant="primaryFlat"
            >
              {t('Read more')}
            </Button>
          </ChakraFlex>
        </DrawerBody>
      </Dialog>

      <BadFlipDialog
        isOpen={
          isReportDialogOpen ||
          state.matches('longSession.solve.answer.finishFlips')
        }
        title={t('Earn rewards for reporting')}
        subtitle={t(
          'Report bad flips and get rewarded if these flips are reported by more than 50% of other participants'
        )}
        onClose={() => {
          if (state.matches('longSession.solve.answer.finishFlips')) {
            flipsToLeft()
            send('START_KEYWORDS_QUALIFICATION')
          } else onCloseReportDialog()
        }}
      />

      <ReviewValidationDialog
        flips={filterSolvableFlips(flips)}
        reportedFlipsCount={reportedFlipsCount}
        availableReportsCount={availableReportsNumber(longFlips)}
        isOpen={state.matches('longSession.solve.answer.review')}
        isSubmitting={isSubmitting(state)}
        isDesktop={isDesktop}
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
        isDesktop={isDesktop}
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
        longFlips.filter(
          ({decoded, missing, failed}) => (decoded || !missing) && !failed
        )
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

function getFlipBorderRadius(index, size, radius) {
  if (index === 0) {
    return `${radius} ${radius} 0 0`
  }
  if (index === size) {
    return `0 0 ${radius} ${radius}`
  }
  return 0
}

function useSingleAndDoubleClick(
  actionSimpleClick,
  actionDoubleClick,
  delay = 250
) {
  const [click, setClick] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (click === 1) actionSimpleClick()
      setClick(0)
    }, delay)

    if (click === 2) actionDoubleClick()

    return () => clearTimeout(timer)
  }, [actionDoubleClick, actionSimpleClick, click, delay])

  return () => setClick(prev => prev + 1)
}
