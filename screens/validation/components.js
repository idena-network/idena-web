/* eslint-disable no-shadow */
/* eslint-disable react/prop-types */
import React, {useEffect, useRef, useState} from 'react'
import {borderRadius, cover, transparentize, rgba} from 'polished'
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
  VStack,
  SlideFade,
  keyframes,
  CloseButton,
} from '@chakra-ui/react'
import {useSwipeable} from 'react-swipeable'
import {Trans, useTranslation} from 'react-i18next'
import {useRouter} from 'next/router'
import useHover from '@react-hook/hover'
import dayjs from 'dayjs'
import durationPlugin from 'dayjs/plugin/duration'
import {Box, Fill, Absolute} from '../../shared/components'
import Flex from '../../shared/components/flex'
import {reorderList} from '../../shared/utils/arr'
import theme, {rem} from '../../shared/theme'
import {adjustDurationInSeconds} from './machine'
import {Tooltip as TooltipLegacy} from '../../shared/components/tooltip'
import {
  Tooltip,
  Dialog,
  DialogBody,
  DialogFooter,
  DrawerFooter,
  Drawer,
  DrawerBody,
  WarningAlert,
} from '../../shared/components/components'
import {
  availableReportsNumber,
  decodedWithKeywords,
  filterRegularFlips,
  filterSolvableFlips,
  rearrangeFlips,
} from './utils'
import {AnswerType, RelevanceType} from '../../shared/types'
import {
  EmptyFlipImage,
  FlipKeywordTranslationSwitchNew,
} from '../flips/components'

import {
  CornerButton,
  IconButton,
  PrimaryButton,
  SecondaryButton,
} from '../../shared/components/button'
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
  NewStarIcon,
  HollowStarIcon,
} from '../../shared/components/icons'
import {use100vh} from '../../shared/hooks/use-100vh'
import {useIsDesktop} from '../../shared/utils/utils'
import {useTimer} from '../../shared/hooks/use-timer'

dayjs.extend(durationPlugin)

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

const shake = keyframes`
  from, to {
    -webkit-transform: translate3d(0, 0, 0);
    transform: translate3d(0, 0, 0);
  }

  10%{
    -webkit-transform: translate3d(0, -30px, 0);
    transform: translate3d(0, -30px, 0);
  }

  50% {
    -webkit-transform: translate3d(0, -15px, 0);
    transform: translate3d(0, -15px, 0);
  }

  30%{
    -webkit-transform: translate3d(0, 10px, 0);
    transform: translate3d(0, 10px, 0);
  }

  80% {
    -webkit-transform: translate3d(0, 5px, 0);
    transform: translate3d(0, 5px, 0);
  }
`

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
  isTrainingValidation,
  isWrongAnswer,
}) {
  const {t} = useTranslation()
  const chakraTheme = useTheme()
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
      containerId: 'zoomedFlips',
      horizontal: false,
      offset: -80,
    })
  }

  const onFLipClick = e => {
    if (e.ctrlKey || e.metaKey) {
      onOpenFlipZoom()
    } else {
      onChoose(hash)
    }
  }

  if ((fetched && !decoded) || failed) return <FailedFlip />
  if (!fetched) return <LoadingFlip />

  const isSelected = option === variant
  const showWrongAnswer = isWrongAnswer && isSelected

  return (
    <ChakraBox ref={refFlipHover}>
      <FlipHolder
        showWrongAnswer={showWrongAnswer}
        isZoomHovered={isZoomIconHovered}
        css={
          // eslint-disable-next-line no-nested-ternary
          option
            ? isSelected
              ? {
                  border: `solid ${rem(2)} ${
                    isWrongAnswer
                      ? chakraTheme.colors.red['500']
                      : chakraTheme.colors.blue['500']
                  }`,
                  boxShadow: `0 0 ${rem(2)} ${rem(3)} ${transparentize(
                    0.75,
                    isWrongAnswer
                      ? chakraTheme.colors.red['500']
                      : chakraTheme.colors.blue['500']
                  )}`,
                  transition:
                    !isWrongAnswer && 'all .3s cubic-bezier(.5, 0, .5, 1)',
                  animation: isWrongAnswer && `${shake} ${600}ms`,
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
          <ChakraBox
            key={idx}
            h={[
              `calc((${windowHeight}px - 290px) / 4)`,
              'calc((100vh - 260px) / 4)',
            ]}
            borderRadius={getFlipBorderRadius(idx, images.length - 1, radius)}
            css={{
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={
              isDesktop
                ? e => {
                    onFLipClick(e)
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
      {showWrongAnswer && (
        <ChakraFlex justifyContent="center" alignItems="center" mt={2} w="100%">
          <ChakraFlex
            bg="red.020"
            color="red.500"
            borderRadius="10px"
            px={2}
            py={1}
            fontSize="sm"
            fontWeight={500}
          >
            {t('Wrong')}
          </ChakraFlex>
        </ChakraFlex>
      )}
    </ChakraBox>
  )
}

function FlipHolder({css, showWrongAnswer, isZoomHovered = false, ...props}) {
  const windowHeight = use100vh()
  return (
    <Tooltip
      isOpen={isZoomHovered}
      label="Ctrl+Click to zoom"
      placement="top"
      zIndex="tooltip"
      bg="graphite.500"
    >
      <ChakraFlex
        justify="center"
        direction="column"
        position="relative"
        h={[
          showWrongAnswer
            ? `calc(${windowHeight}px - 340px)`
            : `calc(${windowHeight}px - 290px)`,
          showWrongAnswer ? 'calc(100vh - 310px)' : 'calc(100vh - 260px)',
        ]}
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
  isBest,
  isDesktop,
  onPick,
}) {
  const isQualified = !!relevance
  const hasIrrelevantWords = relevance === RelevanceType.Irrelevant
  const flipPreviewSize = useBreakpointValue(['100%', 32])
  const flipPreviewBorderRadius = useBreakpointValue(['16px', '12px'])
  const bestRewardTooltipPlacement = useBreakpointValue([
    'bottom-start',
    'top-start',
  ])

  const [bestRewardTooltipShowed, setBestRewardTooltipShowed] = useState(false)
  const [bestRewardTooltipOpen, setBestRewardTooltipOpen] = useState(false)
  useEffect(() => {
    if (isBest && isCurrent && !bestRewardTooltipShowed) {
      setBestRewardTooltipOpen(true)
      setBestRewardTooltipShowed(true)
    }
  }, [isBest, isCurrent, bestRewardTooltipShowed])
  useEffect(() => {
    if (!isCurrent || !isBest) {
      setBestRewardTooltipOpen(false)
    }
    if (bestRewardTooltipOpen) {
      setTimeout(() => {
        setBestRewardTooltipOpen(false)
      }, 5000)
    }
  }, [bestRewardTooltipOpen, isBest, isCurrent])

  return (
    <ThumbnailHolder
      name={flipId}
      isCurrent={isCurrent}
      isLong={isLong}
      isBest={isBest}
      isDesktop={isDesktop}
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
          <ChakraFlex
            justify="center"
            align={['flex-end', 'flex-start']}
            w="100%"
            h="100%"
            position="absolute"
          >
            <ChakraBox>
              <Tooltip
                isOpen={bestRewardTooltipOpen}
                label="This flip will be rewarded with an 8x reward if other members also mark it as the best"
                fontSize="mdx"
                fontWeight={400}
                mt={[2, 0]}
                mb={[0, 2]}
                px={3}
                py={[2, '10px']}
                w={['228px', 'auto']}
                placement={bestRewardTooltipPlacement}
                openDelay={100}
              >
                {' '}
              </Tooltip>
            </ChakraBox>
          </ChakraFlex>
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

function ThumbnailHolder({
  isCurrent,
  isLong,
  isBest,
  isDesktop,
  children,
  ...props
}) {
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
        {isBest && (
          <ChakraFlex
            position="absolute"
            top={['-4px', '-8px']}
            right={['-4px', '-8px']}
            w={5}
            h={5}
            align="center"
            justify="center"
            borderRadius="50%"
            backgroundColor="white"
            zIndex={2}
          >
            <NewStarIcon w={2} h={2} color="white" />
          </ChakraFlex>
        )}
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
  validationStart,
  onSkip,
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
        <Heading
          fontSize="20px"
          fontWeight={500}
          textAlign="center"
          position="relative"
          px={6}
          w="full"
          mb={2}
        >
          {t(`Is the flip correct?`)}
          <ChakraFlex
            position="absolute"
            right={2}
            top={0}
            height="100%"
            alignItems="center"
          >
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
        </Heading>
      </ChakraFlex>
      <ChakraBox
        px={[5, 10]}
        py={8}
        rounded="lg"
        w={['100%', '320px']}
        mb={8}
        bg={[words.length ? '' : 'gray.50', 'gray.50']}
      >
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
          <VStack spacing={2}>
            <ChakraBox
              lineHeight="20px"
              fontWeight={500}
              fontSize={['16px', 'md']}
              textAlign="center"
            >
              {t(`Getting flip keywords...`)}
            </ChakraBox>
            <ChakraBox
              color="muted"
              lineHeight="20px"
              mt={2}
              textAlign="center"
              fontSize={['14px', 'md']}
            >
              {t(
                'The author of the flip has not published the keywords yet. Please wait or skip this flip.'
              )}
            </ChakraBox>
            <ChakraBox pt={2}>
              <FlipWordsTimer
                validationStart={validationStart}
                duration={210}
                onSkip={onSkip}
              />
            </ChakraBox>
          </VStack>
        )}
      </ChakraBox>
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
  const adjustedDuration = React.useMemo(
    () => adjustDurationInSeconds(validationStart, duration) * 1000,
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
  const [{remaining, isStopped, isRunning}, {reset}] = useTimer(duration)

  useEffect(() => {
    reset(duration)
  }, [duration, reset])

  return (
    <Box style={{fontVariantNumeric: 'tabular-nums', minWidth: rem(37)}}>
      <Text color={color} fontSize={['16px', '13px']} fontWeight={500}>
        {isStopped && '00:00'}
        {isRunning && dayjs.duration(remaining).format('mm:ss')}
      </Text>
    </Box>
  )
}

export function FlipWordsTimer({validationStart, duration, onSkip}) {
  const {t} = useTranslation()
  const adjustedDuration = React.useMemo(
    () => adjustDurationInSeconds(validationStart, duration) * 1000,
    [duration, validationStart]
  )

  const [{remaining}, {reset}] = useTimer(adjustedDuration)

  useEffect(() => {
    reset(adjustedDuration)
  }, [adjustedDuration, reset])

  return remaining > 0 ? (
    <Box style={{fontVariantNumeric: 'tabular-nums', minWidth: rem(37)}}>
      <Text color="gray.500" fontSize={['16px', '13px']} fontWeight={500}>
        {dayjs.duration(remaining).format('mm:ss')}
      </Text>
    </Box>
  ) : (
    <Button
      variant="outline"
      borderColor="gray.200"
      color="gray.500"
      onClick={() => onSkip?.()}
      _active={{
        bg: 'unset',
      }}
    >
      {t('Skip')}
    </Button>
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

  const approvedCount = flips.filter(
    flip => flip.relevance === RelevanceType.Relevant
  ).length

  const abstainedCount = flips.filter(
    flip =>
      (flip.relevance ?? RelevanceType.Abstained) === RelevanceType.Abstained
  ).length

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
                label={t('Approved')}
                value={approvedCount}
              />
              <ReviewValidationDialog.Stat
                label={t('Reported')}
                value={reportedFlipsCount}
              />
              {availableReportsCount - reportedFlipsCount > 0 ? (
                <ReviewValidationDialog.Stat
                  label={t('Unused reports')}
                  value={availableReportsCount - reportedFlipsCount}
                />
              ) : (
                <ReviewValidationDialog.Stat
                  label={t('Abstained')}
                  value={abstainedCount}
                />
              )}
            </Stack>
            {(areFlipsUnanswered || areReportsMissing) && (
              <Stack>
                {areFlipsUnanswered && (
                  <Text color="muted">
                    <Trans i18nKey="reviewMissingFlips" t={t}>
                      You need to answer{' '}
                      <ReviewValidationDialog.LinkButton
                        onClick={onMisingAnswers}
                      >
                        all flips
                      </ReviewValidationDialog.LinkButton>{' '}
                      otherwise you may fail the validation.
                    </Trans>
                  </Text>
                )}
                {areReportsMissing && (
                  <Text color="muted">
                    <Trans i18nKey="reviewMissingReports" t={t}>
                      Use{' '}
                      <ReviewValidationDialog.LinkButton
                        variant="link"
                        onClick={onMisingReports}
                      >
                        all available reports
                      </ReviewValidationDialog.LinkButton>{' '}
                      to get maximum rewards.
                    </Trans>
                  </Text>
                )}
              </Stack>
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
    delta: 50,
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
            {t('What is a bad flip?')}
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
            align={['center', 'initial']}
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

function ValidationCloseDialog({onSubmit, onClose, isDesktop, ...props}) {
  const {t} = useTranslation()

  const size = useBreakpointValue(['mdx', 'md'])
  const variantPrimary = useBreakpointValue(['primaryFlat', 'primary'])
  const variantSecondary = useBreakpointValue(['secondaryFlat', 'secondary'])

  return (
    <Dialog
      title={t('Are you sure?')}
      onClose={onClose}
      isDesktop={isDesktop}
      isCloseable={false}
      {...props}
    >
      <DialogBody>
        <Text>{t('Do you want to exit training validation?')}</Text>
      </DialogBody>
      <DialogFooter>
        <Button
          variant={variantSecondary}
          size={size}
          w={['100%', 'auto']}
          onClick={onSubmit}
        >
          {t('Exit')}
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
          onClick={onClose}
        >
          {t('Cancel')}
        </Button>
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
  onClose,
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
    isOpen: isCloseDialogOpen,
    onOpen: onOpenCloseDialog,
    onClose: onCloseCloseDialog,
  } = useDisclosure()

  const {
    currentIndex,
    bestFlipHashes,
    translations,
    reports,
    longFlips,
    isTraining,
    isSample,
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
    delta: 50,
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  })

  const flipTimerDetails = {
    state,
    validationStart,
    shortSessionDuration,
    longSessionDuration,
  }

  const reportsCount = Object.keys(reports).length

  const [bestRewardTipOpen, setBestRewardTipOpen] = useState(false)
  useEffect(() => {
    if (currentFlip && currentFlip.relevance === RelevanceType.Relevant) {
      setBestRewardTipOpen(true)
    }
  }, [currentFlip])
  useEffect(() => {
    if (bestFlipHashes[currentFlip?.hash]) {
      setBestRewardTipOpen(false)
    }
  }, [bestFlipHashes, currentFlip])
  useEffect(() => {
    if (bestRewardTipOpen) {
      setTimeout(() => {
        setBestRewardTipOpen(false)
      }, 5000)
    }
  }, [bestRewardTipOpen])

  return (
    <ValidationScene
      bg={isShortSession(state) ? theme.colors.black : theme.colors.white}
    >
      <Header>
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
          w={['130px', 'auto']}
          textAlign="center"
        >
          {/* eslint-disable-next-line no-nested-ternary */}
          {['shortSession', 'longSession'].some(state.matches) &&
          !isLongSessionKeywords(state)
            ? isDesktop
              ? t('Select meaningful story: left or right', {nsSeparator: '!'})
              : t('Select meaningful story', {nsSeparator: '!'})
            : isDesktop
            ? t('Check flips quality')
            : ''}
          {t(` (${currentIndex + 1} of ${flips.length})`)}
        </Title>
        {isTraining && (
          <ChakraFlex
            position="absolute"
            top={[-2, 5]}
            right={4}
            alignItems="center"
          >
            <ChakraFlex
              bg="warning.020"
              fontSize="md"
              color="warning.500"
              fontWeight={500}
              borderRadius="15px"
              px={4}
              py={1}
              display={['none', 'block']}
            >
              {t('Training validation')}
            </ChakraFlex>
            <Divider
              display={['none', 'flex']}
              h={8}
              orientation="vertical"
              color="gray.100"
              ml={4}
              mr={1}
            />
            <CloseButton
              _hover={{
                bg: 'none',
              }}
              size="lg"
              color={isShortSession(state) ? 'white' : 'brandGray.500'}
              onClick={() => onOpenCloseDialog()}
            ></CloseButton>
          </ChakraFlex>
        )}
      </Header>
      <ChakraBox order={[3, 2]}>
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
              align="flex-start"
              position="relative"
              {...handlers}
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
                validationStart={validationStart}
                onSkip={() => {
                  if (isLastFlip(state)) {
                    send({type: 'SUBMIT'})
                  } else {
                    send({type: 'NEXT'})
                    if (!isDesktop) {
                      scrollToCurrentFlip(currentIndex + 1)
                    }
                  }
                }}
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
                          type: 'APPROVE_WORDS',
                          hash: currentFlip.hash,
                        })
                      }
                    >
                      {t('Approve')}
                    </QualificationButton>
                    <Tooltip
                      label={t(
                        'All available reports are used. You can skip this flip or remove Report status from other flips.'
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
                            type: 'REPORT_WORDS',
                            hash: currentFlip.hash,
                          })
                        }
                      >
                        {t('Report')}{' '}
                        {t('({{count}} left)', {
                          count:
                            availableReportsNumber(longFlips) - reportsCount,
                        })}
                      </QualificationButton>
                    </Tooltip>
                  </QualificationActions>
                  {isDesktop && (
                    <SlideFade
                      style={{
                        zIndex:
                          currentFlip.relevance === RelevanceType.Relevant &&
                          (Object.keys(bestFlipHashes).length < 1 ||
                            bestFlipHashes[currentFlip.hash])
                            ? 'auto'
                            : -1,
                      }}
                      offsetY="-80px"
                      in={
                        currentFlip.relevance === RelevanceType.Relevant &&
                        (Object.keys(bestFlipHashes).length < 1 ||
                          bestFlipHashes[currentFlip.hash])
                      }
                    >
                      <Divider mt={1} />
                      <ChakraFlex direction="column" align="center">
                        <Button
                          backgroundColor="transparent"
                          border="solid 1px #d2d4d9"
                          color="brandGray.500"
                          borderRadius={6}
                          mt={5}
                          w={['100%', 'auto']}
                          isActive={!!bestFlipHashes[currentFlip.hash]}
                          _hover={{
                            backgroundColor: 'transparent',
                            _disabled: {
                              backgroundColor: 'transparent',
                              color: '#DCDEDF',
                            },
                          }}
                          _active={{
                            backgroundColor: '#F5F6F7',
                          }}
                          onClick={() =>
                            send({
                              type: 'FAVORITE',
                              hash: currentFlip.hash,
                            })
                          }
                        >
                          {bestFlipHashes[currentFlip.hash] ? (
                            <NewStarIcon
                              h="12.5px"
                              w="13px"
                              mr="5.5px"
                              fill="brandGray.500"
                            />
                          ) : (
                            <HollowStarIcon
                              h="12.5px"
                              w="13px"
                              mr="5.5px"
                              fill="brandGray.500"
                            />
                          )}
                          {t('Mark as the best')}
                        </Button>
                        <Text fontSize="11px" color="#B8BABC" mt={2}>
                          {t('You can mark this flip as the best')}
                        </Text>
                      </ChakraFlex>
                    </SlideFade>
                  )}
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
          {!isDesktop &&
            currentFlip &&
            currentFlip.relevance === RelevanceType.Relevant &&
            (Object.keys(bestFlipHashes).length < 1 ||
              bestFlipHashes[currentFlip.hash]) && (
              <Tooltip
                isOpen={bestRewardTipOpen}
                hasArrow={false}
                label={t('You can mark this flip as the best')}
                placement="top"
                fontSize="mdx"
                px={3}
                py="10px"
                mr={5}
                variant="z-index-1000"
              >
                <ChakraFlex
                  align="center"
                  justify="center"
                  position="absolute"
                  top="-100px"
                  right={5}
                  w={14}
                  h={14}
                  borderRadius="50%"
                  boxShadow="0px 2px 4px rgba(0, 0, 0, 0.16)"
                  backgroundColor="white"
                  onClick={() =>
                    send({
                      type: 'FAVORITE',
                      hash: currentFlip.hash,
                    })
                  }
                >
                  {bestFlipHashes[currentFlip.hash] ? (
                    <NewStarIcon h={5} w={5} fill="brandGray.500" />
                  ) : (
                    <HollowStarIcon h={5} w={5} fill="brandGray.500" />
                  )}
                </ChakraFlex>
              </Tooltip>
            )}
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
            isBest={bestFlipHashes[flip.hash]}
            isDesktop={isDesktop}
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

      {state.matches('validationFailed') && !isSample && (
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
        reportedFlipsCount={reportsCount}
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

      <ValidationCloseDialog
        isOpen={isCloseDialogOpen}
        onSubmit={() => onClose && onClose()}
        onClose={onCloseCloseDialog}
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

export function sessionFlips(state) {
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
