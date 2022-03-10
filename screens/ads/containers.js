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
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {Avatar, Menu, Skeleton} from '../../shared/components/components'
import {AdsIcon, PicIcon} from '../../shared/components/icons'

import {useAdRotation} from './hooks'
import {omit, pick} from '../../shared/utils/utils'
import {getRandomInt} from '../flips/utils'

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
        <AdBannerSkeleton isLoaded={Boolean(title)}>
          <LinkOverlay href={url} target="_blank">
            <Text lineHeight="none">{title}</Text>
          </LinkOverlay>
        </AdBannerSkeleton>
        <AdBannerSkeleton isLoaded={Boolean(author)}>
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
  // usetheme
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
