import React from 'react'
import {
  AspectRatio,
  Flex,
  HStack,
  Image,
  LinkBox,
  LinkOverlay,
  Stack,
  Text,
  MenuItem,
  Box,
  Heading,
  Stat,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {
  Avatar,
  Drawer,
  DrawerPromotionPortal,
  ExternalLink,
  Menu,
  Skeleton,
  SuccessAlert,
} from '../../shared/components/components'
import {AdsIcon, PicIcon} from '../../shared/components/icons'

import {useAdRotation} from './hooks'
import {omit, pick} from '../../shared/utils/utils'
import {getRandomInt} from '../flips/utils'
import {AdStatLabel, AdStatNumber} from './components'

export function AdBanner() {
  const {t} = useTranslation()

  const router = useRouter()

  const ads = useAdRotation()

  const ad = ads[getRandomInt(0, ads?.length)]

  return (
    <Flex
      align="center"
      justify="space-between"
      borderBottomWidth={1}
      borderBottomColor="gray.100"
      px={4}
      py={2}
    >
      <AdBannerActiveAd {...ad} />
      {false && (
        <Menu>
          <MenuItem
            icon={<AdsIcon boxSize={5} color="blue.500" />}
            onClick={() => {
              router.push(`/ads/list`)
            }}
          >
            {t('My Ads')}
          </MenuItem>
          <MenuItem icon={<PicIcon boxSize={5} color="blue.500" />}>
            {t('View all offers')}
          </MenuItem>
        </Menu>
      )}
    </Flex>
  )
}

function AdBannerActiveAd({title, url, cover, author}) {
  return (
    <LinkBox as={HStack} spacing={2}>
      <AdBannerSkeleton isLoaded={Boolean(cover)}>
        <PlainAdCoverImage src={cover} w={10} />
      </AdBannerSkeleton>
      <Stack spacing={1}>
        <AdBannerSkeleton isLoaded={Boolean(title)} minW="2xs" w="2xs" minH={4}>
          <LinkOverlay href={url} target="_blank">
            <Text lineHeight="none">{title}</Text>
          </LinkOverlay>
        </AdBannerSkeleton>
        <AdBannerSkeleton isLoaded={Boolean(author)} minW="xs">
          <HStack spacing={1}>
            <Avatar
              address={author}
              size={4}
              borderWidth={1}
              borderColor="brandGray.016"
              rounded="sm"
            />
            <Text color="muted" fontSize="sm" fontWeight={500}>
              {author}
            </Text>
          </HStack>
        </AdBannerSkeleton>
      </Stack>
    </LinkBox>
  )
}

function AdBannerSkeleton(props) {
  return <Skeleton startColor="gray.50" endColor="gray.100" {...props} />
}

export function AdCoverImage({ad, ...props}) {
  const cover = ad?.cover

  const src = React.useMemo(
    () => URL.createObjectURL(new Blob([cover], {type: 'image/jpeg'})),
    [cover]
  )

  return <PlainAdCoverImage src={src} {...props} />
}

// TODO: https://github.com/chakra-ui/chakra-ui/issues/5285
export function PlainAdCoverImage(props) {
  const boxProps = pick(props, ['w', 'width', 'h', 'height', 'boxSize'])
  const imageProps = omit(props, Object.keys(boxProps))

  return (
    <AspectRatio ratio={1} {...boxProps}>
      <Image ignoreFallback bg="gray.50" rounded="lg" {...imageProps} />
    </AspectRatio>
  )
}

export function AdDrawer({isMining = true, children, ...props}) {
  const ads = useAdRotation()

  const hasRotatingAds = ads?.length > 0

  return (
    <Drawer {...props}>
      {children}

      {isMining && hasRotatingAds && (
        <DrawerPromotionPortal>
          <AdPromotion {...ads[getRandomInt(0, ads?.length)]} />
        </DrawerPromotionPortal>
      )}
    </Drawer>
  )
}

function AdPromotion({title, url, cover, author}) {
  const {t} = useTranslation()

  return (
    <Box bg="white" rounded="lg" px={10} pt={37} pb={44} w={400} h={620}>
      <Stack spacing="10">
        <Stack spacing="4">
          <Stack spacing="1.5">
            <Heading as="h4" fontWeight="semibold" fontSize="md">
              {title}
            </Heading>
            <ExternalLink href={url}>{url}</ExternalLink>
          </Stack>
          <PlainAdCoverImage src={cover} w={320} objectFit="cover" />
        </Stack>
        <Stack spacing={6}>
          <HStack justify="space-between" align="flex-start">
            <BlockAdStat label="Sponsored by" value={author} />
          </HStack>
          <Box>
            <SuccessAlert fontSize="md">
              {t('Watching ads makes your coin valuable!')}
            </SuccessAlert>
          </Box>
        </Stack>
      </Stack>
    </Box>
  )
}

export function BlockAdStat({label, value, children, ...props}) {
  return (
    <Stat {...props}>
      {label && <AdStatLabel>{label}</AdStatLabel>}
      {value && <AdStatNumber>{value}</AdStatNumber>}
      {children}
    </Stat>
  )
}
