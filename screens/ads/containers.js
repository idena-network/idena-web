import React from 'react'
import NextLink from 'next/link'
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
  IconButton,
  Button,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {TriangleUpIcon} from '@chakra-ui/icons'
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
import {useActiveAd, useRotatingAdList, useAdRotation} from './hooks'
import {omit, pick} from '../../shared/utils/utils'
import {AdStatLabel, AdStatNumber} from './components'

export function AdBanner() {
  const {t} = useTranslation()

  const router = useRouter()

  const activeAd = useActiveAd()

  return (
    <Flex
      align="center"
      justify="space-between"
      borderBottomWidth={1}
      borderBottomColor="gray.100"
      px={4}
      py={2}
      maxH={14}
    >
      <AdBannerActiveAd {...activeAd} />
      <Menu>
        {false && (
          <MenuItem
            icon={<AdsIcon boxSize={5} color="blue.500" />}
            onClick={() => {
              router.push(`/ads/list`)
            }}
          >
            {t('My Ads')}
          </MenuItem>
        )}
        <NextLink href="/ads/offers">
          <MenuItem icon={<PicIcon boxSize={5} color="blue.500" />}>
            {t('View all offers')}
          </MenuItem>
        </NextLink>
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
        <AdBannerSkeleton isLoaded={Boolean(title)} minH={4} w="md">
          <LinkOverlay href={url} target="_blank">
            <Text lineHeight={4} isTruncated>
              {title}
            </Text>
          </LinkOverlay>
        </AdBannerSkeleton>
        <AdBannerSkeleton isLoaded={Boolean(author)} minW="lg">
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
  const ads = useRotatingAdList()

  const hasRotatingAds = ads.length > 0

  const {currentIndex, prev, next, setCurrentIndex} = useAdRotation()

  const activeAd = ads[currentIndex]

  return (
    <Drawer {...props}>
      {children}

      {isMining && hasRotatingAds && (
        <DrawerPromotionPortal>
          <Stack spacing="4">
            <HStack spacing="16">
              <IconButton
                variant="unstyled"
                color="xwhite.050"
                icon={<TriangleUpIcon transform="rotate(-90deg)" />}
                _hover={{
                  color: 'white',
                }}
                onClick={prev}
              />

              <AdPromotion {...activeAd} />

              <IconButton
                variant="unstyled"
                color="xwhite.050"
                icon={<TriangleUpIcon transform="rotate(90deg)" />}
                _hover={{
                  color: 'white',
                }}
                onClick={next}
              />
            </HStack>
            <HStack spacing="2.5" justify="center" align="center" h="2">
              {ads.map((_, idx) => {
                const isCurrrent = currentIndex === idx

                const isSibling = Math.abs(currentIndex - idx) === 1

                // eslint-disable-next-line no-nested-ternary
                const boxSize = isCurrrent ? '2' : isSibling ? '1.5' : '1'

                return (
                  <Button
                    variant="unstyled"
                    bg={
                      // eslint-disable-next-line no-nested-ternary
                      isCurrrent
                        ? 'white'
                        : isSibling
                        ? 'transparent'
                        : 'xwhite.016'
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
            <Heading as="h4" fontWeight="semibold" fontSize="md" isTruncated>
              {title}
            </Heading>
            <ExternalLink href={url} fontWeight="semibold">
              {url}
            </ExternalLink>
          </Stack>
          <PlainAdCoverImage src={cover} w={320} objectFit="cover" />
        </Stack>
        <Stack spacing="6">
          <Stat>
            <AdStatLabel color="gray.500" fontWeight={500} lineHeight={4}>
              {t('Sponsored by')}
            </AdStatLabel>
            <AdStatNumber color="muted" fontSize="sm" mt="1.5" h="4">
              <HStack spacing="1" align="center">
                <Avatar address={author} boxSize={4} />
                <Text as="span">{author}</Text>
              </HStack>
            </AdStatNumber>
          </Stat>
          <SuccessAlert fontSize="md">
            {t('Watching ads makes your coin valuable!')}
          </SuccessAlert>
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
