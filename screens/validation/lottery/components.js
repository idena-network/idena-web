import {TriangleUpIcon} from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  IconButton,
  LinkBox,
  LinkOverlay,
  Stack,
  Text,
} from '@chakra-ui/react'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useSwipeable} from 'react-swipeable'
import {
  Avatar,
  ExternalLink,
  SmallText,
  SuccessAlert,
} from '../../../shared/components/components'
import {InfoIcon} from '../../../shared/components/icons'
import {useInterval} from '../../../shared/hooks/use-interval'
import {useLanguage} from '../../../shared/hooks/use-language'
import {AdBurnKey} from '../../../shared/models/adBurnKey'
import {AdImage} from '../../ads/components'
import {useBurntCoins, useFormatDna, useRotateAds} from '../../ads/hooks'

export function LotteryCountdown({duration}) {
  const [state, tick] = React.useReducer(
    prevState => ({
      elapsed: prevState.elapsed - 1,
      delay: prevState.elapsed > 1 ? prevState.delay : null,
    }),
    {elapsed: duration / 1000, delay: 1000}
  )

  useInterval(tick, state.delay)

  const elapsedSecondsInMinute = state.elapsed % 60
  const elapsedMinutes = Math.round(
    (state.elapsed - elapsedSecondsInMinute) / 60
  )

  return (
    <HStack spacing="3">
      <CountdownTimeCard value={elapsedMinutes} unit="minutes" />
      <CountdownTimeCard value={elapsedSecondsInMinute} unit="seconds" />
    </HStack>
  )
}

function CountdownTimeCard({value, unit, ...props}) {
  return (
    <Stack spacing="3" align="center" {...props}>
      <Center
        bg="gray.500"
        borderRadius="lg"
        fontSize="2xl"
        fontWeight={500}
        w="20"
        h="72px"
        sx={{fontVariantNumeric: 'tabular-nums'}}
      >
        {String(value).padStart(2, '0')}
      </Center>
      <Text as="span" color="muted" fontSize="md">
        {unit}
      </Text>
    </Stack>
  )
}

export function LotteryAdPromotion(props) {
  const {t} = useTranslation()

  const {lng} = useLanguage()

  const {ads, currentIndex, setCurrentIndex, prev, next} = useRotateAds()

  const currentAd = ads[currentIndex]

  const {data: burntCoins} = useBurntCoins()

  const orderedBurntCoins =
    burntCoins
      ?.sort((a, b) => b.amount - a.amount)
      .map(burn => ({...burn, ...AdBurnKey.fromHex(burn?.key)})) ?? []

  const maybeBurn = orderedBurntCoins.find(burn => burn.cid === currentAd?.cid)

  const formatDna = useFormatDna()

  const swipeProps = useSwipeable({
    onSwipedLeft: next,
    onSwipedRight: prev,
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  })

  const burnDuration = new Intl.RelativeTimeFormat(lng, {
    style: 'short',
  }).format(24, 'hour')

  return (
    <Stack spacing="4">
      <Box position="relative">
        <AdNavButton
          icon={<TriangleUpIcon transform="rotate(-90deg)" />}
          position="absolute"
          left="-12"
          top="50%"
          transform="translateY(-50%)"
          onClick={prev}
        />
        <Stack
          spacing="7"
          bg="gray.500"
          borderRadius="lg"
          p="10"
          w="full"
          {...props}
        >
          <Stack direction="row" spacing="8" {...swipeProps}>
            <LinkBox>
              <LinkOverlay href={currentAd?.url} isExternal>
                <AdImage src={currentAd?.media} w="148px" />
              </LinkOverlay>
            </LinkBox>
            <Stack spacing="5">
              <Stack spacing="1.5">
                <Stack spacing="2">
                  <Heading as="h3" fontSize="md" fontWeight={500} isTruncated>
                    {currentAd?.title}
                  </Heading>
                  <Text color="muted">{currentAd?.desc}</Text>
                </Stack>
                <ExternalLink href={currentAd?.url}>
                  {currentAd?.url}
                </ExternalLink>
              </Stack>
              <Stack direction="row" spacing="8">
                <AdStat label={t('Sponsored by')} maxW="24">
                  <AdStatValue as={HStack} spacing="1" align="center">
                    <Avatar
                      address={currentAd?.author}
                      boxSize="4"
                      borderRadius="sm"
                    />
                    <Text as="span" isTruncated>
                      {currentAd?.author}
                    </Text>
                  </AdStatValue>
                </AdStat>
                <AdStat
                  label={t('Burnt, {{time}}', {time: burnDuration})}
                  value={formatDna(maybeBurn?.amount ?? 0)}
                />
              </Stack>
            </Stack>
          </Stack>
          <SuccessAlert
            icon={<InfoIcon color="green.500" mr="3" />}
            fontSize="md"
          >
            {t('Watching ads makes your coin valuable!')}
          </SuccessAlert>
        </Stack>
        <AdNavButton
          icon={<TriangleUpIcon transform="rotate(90deg)" />}
          position="absolute"
          right="-12"
          top="50%"
          transform="translateY(-50%)"
          onClick={next}
        />
      </Box>
      <HStack spacing="2.5" justify="center" align="center" h="2">
        {ads.map((ad, idx) => {
          const isCurrrent = currentIndex === idx

          const isSibling = Math.abs(currentIndex - idx) === 1

          // eslint-disable-next-line no-nested-ternary
          const boxSize = isCurrrent ? '2' : isSibling ? '1.5' : '1'

          return (
            <Button
              key={ad.cid}
              variant="unstyled"
              bg={
                // eslint-disable-next-line no-nested-ternary
                isCurrrent ? 'white' : isSibling ? 'transparent' : 'xwhite.016'
              }
              borderColor="xwhite.016"
              borderWidth={isSibling ? 2 : 0}
              rounded="full"
              boxSize={boxSize}
              minW={boxSize}
              onClick={() => {
                setCurrentIndex(idx)
              }}
            />
          )
        })}
      </HStack>
    </Stack>
  )
}

function AdStat({label, value, children, ...props}) {
  return (
    <Stack spacing="1.5" {...props}>
      <Text fontWeight={500} lineHeight="4">
        {label}
      </Text>
      {value && <AdStatValue>{value}</AdStatValue>}
      {children}
    </Stack>
  )
}

function AdStatValue(props) {
  return <SmallText fontWeight={500} lineHeight={[null, '14px']} {...props} />
}

function AdNavButton(props) {
  return (
    <IconButton
      variant="unstyled"
      size="sm"
      color="xwhite.050"
      _hover={{
        color: 'white',
      }}
      transition="all 0.2s ease-out"
      {...props}
    />
  )
}
