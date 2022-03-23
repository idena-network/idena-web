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
  Textarea,
  VisuallyHiddenInput,
  Center,
  FormControl,
  MenuDivider,
  Button,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {TriangleUpIcon} from '@chakra-ui/icons'
import {useMutation} from 'react-query'
import {
  Avatar,
  Badge,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerPromotionPortal,
  ExternalLink,
  FillCenter,
  FormLabel,
  HDivider,
  Input,
  Menu,
  Skeleton,
  SuccessAlert,
  TextLink,
  VDivider,
  Select,
} from '../../shared/components/components'
import {
  useActiveAd,
  useRotatingAdList,
  useAdRotation,
  useAdStatusColor,
  useAdStatusText,
  useFormatDna,
} from './hooks'
import {omit, pick} from '../../shared/utils/utils'
import {
  AdsIcon,
  DeleteIcon,
  EditIcon,
  OracleIcon,
  PhotoIcon,
  PicIcon,
  UploadIcon,
} from '../../shared/components/icons'
import {useSuccessToast, useFailToast} from '../../shared/hooks/use-toast'
import {
  AdFormField,
  AdStatLabel,
  AdStatNumber,
  FormSection,
  FormSectionTitle,
} from './components'
import {Fill} from '../../shared/components'
import {hasImageType} from '../../shared/utils/img'
import {
  IconButton,
  PrimaryButton,
  SecondaryButton,
} from '../../shared/components/button'
import {AVAILABLE_LANGS} from '../../i18n'
import {isApprovedAd, isReviewingAd, OS} from './utils'
import {useAuthState} from '../../shared/providers/auth-context'
import {AdStatus, AdVotingOptionId} from './types'
import {viewVotingHref} from '../oracles/utils'

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
  const thumb = ad?.thumb

  const src = React.useMemo(
    () => URL.createObjectURL(new Blob([thumb], {type: 'image/jpeg'})),
    [thumb]
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

const InlineAdGroupContext = React.createContext({})

export function InlineAdStatGroup({labelWidth, children, ...props}) {
  return (
    <Stack {...props}>
      <InlineAdGroupContext.Provider value={{labelWidth}}>
        {children}
      </InlineAdGroupContext.Provider>
    </Stack>
  )
}

export function InlineAdStat({label, value, children, ...props}) {
  const {labelWidth} = React.useContext(InlineAdGroupContext)

  return (
    <Stat flex={0} lineHeight="normal" {...props}>
      <HStack>
        {label && <AdStatLabel width={labelWidth}>{label}</AdStatLabel>}
        {(value || Number.isFinite(value)) && (
          <AdStatNumber>{value}</AdStatNumber>
        )}
        {children}
      </HStack>
    </Stat>
  )
}

export function SmallInlineAdStat({label, value, ...props}) {
  const {labelWidth} = React.useContext(InlineAdGroupContext)

  return (
    <InlineAdStat lineHeight="normal" {...props}>
      <AdStatLabel fontSize="sm" width={labelWidth}>
        {label}
      </AdStatLabel>
      <AdStatNumber fontSize="sm">{value}</AdStatNumber>
    </InlineAdStat>
  )
}

export function AdOverlayStatus({status}) {
  const startColor = useAdStatusColor(status, 'transparent')

  return (
    <Fill
      ronded="lg"
      backgroundImage={`linear-gradient(to top, ${startColor}, transparent)`}
    />
  )
}

export function AdStatusText({children, status = children}) {
  const color = useAdStatusColor(status)

  const statusText = useAdStatusText(status)

  return (
    <Text color={color} fontWeight={500} wordBreak="break-word">
      {statusText}
    </Text>
  )
}

export function AdForm({ad, onSubmit, ...props}) {
  const {t} = useTranslation()

  const [thumb, setThumb] = React.useState(ad?.thumb)
  const thumbRef = React.useRef()

  const [media, setMedia] = React.useState(ad?.media)
  const mediaRef = React.useRef()

  return (
    <form
      onSubmit={e => {
        e.preventDefault()

        if (onSubmit) {
          const formData = new FormData(e.target)
          onSubmit(Object.fromEntries(formData.entries()))
        }
      }}
      {...props}
    >
      <Stack isInline spacing={10}>
        <Stack spacing={6} w="lg">
          <FormSection>
            <FormSectionTitle>{t('Parameters')}</FormSectionTitle>
            <Stack spacing={4} shouldWrapChildren>
              <AdFormField label={t('Title')} isRequired>
                <Input name="title" defaultValue={ad?.title} maxLength={40} />
              </AdFormField>
              <AdFormField label={t('Description')} isRequired>
                <Textarea
                  name="desc"
                  defaultValue={ad?.title}
                  maxLength={70}
                  required
                  borderColor="gray.100"
                  px={3}
                  py={2}
                  _hover={{
                    borderColor: 'gray.100',
                  }}
                />
              </AdFormField>
              <AdFormField label="Link" isRequired>
                <Input
                  type="url"
                  name="url"
                  defaultValue={ad?.url}
                  pattern="https?://.*"
                />
              </AdFormField>
            </Stack>
          </FormSection>
          <FormSection>
            <FormSectionTitle>{t('Targeting conditions')}</FormSectionTitle>
            <Stack spacing={4} shouldWrapChildren>
              <AdFormField label="Language">
                <Select
                  name="language"
                  defaultValue={ad?.language}
                  _hover={{
                    borderColor: 'gray.100',
                  }}
                >
                  <option></option>
                  {AVAILABLE_LANGS.map(lang => (
                    <option key={lang}>{lang}</option>
                  ))}
                </Select>
              </AdFormField>
              <AdFormField label="Age">
                <NumberInput
                  name="age"
                  defaultValue={ad?.age}
                  min={0}
                  max={Number.MAX_SAFE_INTEGER}
                  borderColor="gray.100"
                >
                  <NumberInputField
                    _hover={{
                      borderColor: 'gray.100',
                    }}
                  />
                  <NumberInputStepper borderColor="gray.100">
                    <NumberIncrementStepper color="muted" />
                    <NumberDecrementStepper color="muted" />
                  </NumberInputStepper>
                </NumberInput>
                {/* <Input name="age" defaultValue={ad?.age} /> */}
              </AdFormField>
              <AdFormField label="Stake">
                <NumberInput
                  name="stake"
                  defaultValue={ad?.stake}
                  min={0}
                  max={Number.MAX_SAFE_INTEGER}
                  borderColor="gray.100"
                >
                  <NumberInputField
                    _hover={{
                      borderColor: 'gray.100',
                    }}
                  />
                  <NumberInputStepper borderColor="gray.100">
                    <NumberIncrementStepper color="muted" />
                    <NumberDecrementStepper color="muted" />
                  </NumberInputStepper>
                </NumberInput>
                {/* <Input name="stake" defaultValue={ad?.stake} /> */}
              </AdFormField>
              <AdFormField label="OS">
                <Select
                  name="os"
                  defaultValue={ad?.os}
                  _hover={{
                    borderColor: 'gray.100',
                  }}
                >
                  <option></option>
                  {Object.entries(OS).map(([k, v]) => (
                    <option key={v} value={v}>
                      {k}
                    </option>
                  ))}
                </Select>
              </AdFormField>
            </Stack>
          </FormSection>
        </Stack>
        <Stack spacing="8" pt="12">
          <Stack spacing={4} alignItems="flex-start">
            {thumb ? (
              <PlainAdCoverImage
                src={URL.createObjectURL(
                  new Blob([thumb], {type: 'image/jpeg'})
                )}
                w={20}
              />
            ) : (
              <Center
                bg="gray.50"
                borderWidth={1}
                borderColor="gray.100"
                rounded="lg"
                boxSize="20"
                onClick={() => thumbRef.current.click()}
              >
                <PhotoIcon boxSize={10} color="muted" />
              </Center>
            )}
            <VisuallyHiddenInput
              ref={thumbRef}
              name="thumb"
              type="file"
              accept="image/png,image/jpg,image/jpeg,image/webp"
              opacity={0}
              onChange={async e => {
                const {files} = e.target
                if (files.length) {
                  const [file] = files
                  if (hasImageType(file)) {
                    setThumb(file)
                  }
                }
              }}
            />
            <IconButton
              icon={<UploadIcon boxSize={4} />}
              onClick={() => thumbRef.current.click()}
            >
              {t('Upload preview')}
            </IconButton>
          </Stack>

          <Stack spacing={4} alignItems="flex-start">
            {media ? (
              <PlainAdCoverImage
                src={URL.createObjectURL(
                  new Blob([media], {type: 'image/jpeg'})
                )}
                w={20}
              />
            ) : (
              <Center
                bg="gray.50"
                borderWidth="1px"
                borderColor="gray.100"
                rounded="lg"
                boxSize="20"
                onClick={() => mediaRef.current.click()}
              >
                <PhotoIcon boxSize={10} color="muted" />
              </Center>
            )}
            <VisuallyHiddenInput
              ref={mediaRef}
              name="cover"
              type="file"
              accept="image/*"
              opacity={0}
              onChange={async e => {
                const {files} = e.target
                if (files.length) {
                  const [file] = files
                  if (hasImageType(file)) {
                    setMedia(file)
                  }
                }
              }}
            />
            <IconButton
              icon={<UploadIcon boxSize={4} />}
              onClick={() => mediaRef.current.click()}
            >
              {t('Upload media')}
            </IconButton>
          </Stack>
        </Stack>
      </Stack>
    </form>
  )
}

export function ReviewAdDrawer({ad, ...props}) {
  const {t} = useTranslation()

  const {onClose} = props

  const isMining = true

  return (
    <AdDrawer isMining={isMining} {...props}>
      <DrawerHeader>
        <Stack spacing={4}>
          <Center
            alignSelf="flex-start"
            bg="blue.012"
            w={12}
            minH={12}
            rounded="xl"
          >
            <OracleIcon boxSize={6} color="blue.500" />
          </Center>
          <Heading color="gray.500" fontSize="lg" fontWeight={500}>
            {t('Send to Oracle Voting')}
          </Heading>
        </Stack>
      </DrawerHeader>
      <DrawerBody overflowY="auto" mx={-6} mb={10}>
        <Stack spacing={6} color="gray.500" fontSize="md" p={6} pt={0}>
          <Stack spacing={3}>
            <Text>
              {t(`Please keep in mind that you will not be able to edit the banner
              after it has been submitted for verification`)}
            </Text>
            {isMining && (
              <Badge
                display="inline-flex"
                alignItems="center"
                alignSelf="flex-start"
                colorScheme="orange"
                bg="orange.020"
                color="orange.500"
                fontWeight="normal"
                rounded="xl"
                h={8}
                px={3}
                textTransform="initial"
              >
                {t('Mining...')}
              </Badge>
            )}
          </Stack>
          <Stack spacing={6} bg="gray.50" p={6} rounded="lg">
            <Stack isInline spacing={5}>
              <AdCoverImage ad={ad} w="10" />
              <Box>
                <Text fontWeight={500}>{ad.title}</Text>
                <ExternalLink href={ad.url}>{ad.url}</ExternalLink>
              </Box>
            </Stack>
            <Stack spacing={3}>
              <HDivider />
              <Stack>
                <SmallInlineAdStat label="Language" value={ad.language} />
                <SmallInlineAdStat label="Stake" value={ad.stake} />
                <SmallInlineAdStat label="Age" value={ad.age} />
                <SmallInlineAdStat label="OS" value={ad.os} />
              </Stack>
            </Stack>
          </Stack>
          <form
            id="reviewForm"
            onSubmit={e => {
              e.preventDefault()
              // onSubmit(Number(e.target.elements.amount.value))
            }}
          >
            <FormControl>
              <Stack spacing={3}>
                <FormLabel htmlFor="amount" mb={0}>
                  {t('Review fee, iDNA')}
                </FormLabel>
                <Input id="amount" />
              </Stack>
            </FormControl>
          </form>
        </Stack>
      </DrawerBody>
      <DrawerFooter bg="white">
        <HStack>
          <SecondaryButton onClick={onClose}>{t('Not now')}</SecondaryButton>
          <PrimaryButton
            type="submit"
            form="reviewForm"
            isLoading={isMining}
            loadingText={t('Mining...')}
          >
            {t('Send')}
          </PrimaryButton>
        </HStack>
      </DrawerFooter>
    </AdDrawer>
  )
}

export function PublishAdDrawer({ad, ...props}) {
  const {t} = useTranslation()

  const dna = useFormatDna()

  const isMining = true

  return (
    <AdDrawer isMining={isMining} {...props}>
      <DrawerHeader>
        <Stack spacing={4}>
          <FillCenter
            alignSelf="flex-start"
            bg="blue.012"
            w={12}
            minH={12}
            rounded="xl"
          >
            <AdsIcon boxSize={6} color="blue.500" />
          </FillCenter>
          <Heading fontSize="lg" fontWeight={500}>
            {t('Publish')}
          </Heading>
        </Stack>
      </DrawerHeader>
      <DrawerBody overflowY="auto" mx={-6} mb={10}>
        <Stack spacing={6} color="brandGray.500" fontSize="md" p={6} pt={0}>
          <Text>
            {t(`In order to make your ads visible for Idena users you need to burn
            more coins than competitors targeting the same audience.`)}
          </Text>
          {isMining && (
            <Badge
              display="inline-flex"
              alignItems="center"
              alignSelf="flex-start"
              colorScheme="orange"
              bg="orange.020"
              color="orange.500"
              fontWeight="normal"
              rounded="xl"
              h={8}
              px={3}
              textTransform="initial"
            >
              {t('Mining...')}
            </Badge>
          )}
          <Stack spacing={6} bg="gray.50" p={6} rounded="lg">
            <Stack isInline spacing={5}>
              <AdCoverImage ad={ad} w="10" />
              <Box>
                <Text fontWeight={500}>{ad.title}</Text>
                <ExternalLink href={ad.url}>{ad.url}</ExternalLink>
              </Box>
            </Stack>
            <Stack spacing={3}>
              <HDivider />
              <Stack>
                <InlineAdStat label="Competitors" value={Number(0)} />
                <InlineAdStat label="Max price" value={dna(0)} />
              </Stack>
              <HDivider />
              <Stack>
                <SmallInlineAdStat label="Language" value={ad.language} />
                <SmallInlineAdStat label="Stake" value={ad.stake} />
                <SmallInlineAdStat label="Age" value={ad.age} />
                <SmallInlineAdStat label="OS" value={ad.os} />
              </Stack>
            </Stack>
          </Stack>
        </Stack>
      </DrawerBody>
      <DrawerFooter
        borderWidth={1}
        borderColor="gray.100"
        py={3}
        px={4}
        position="absolute"
        left={0}
        right={0}
        bottom={0}
      >
        <PrimaryButton
          isLoading={isMining}
          loadingText={t('Mining...')}
          onClick={() => {
            // submit form
          }}
        >
          {t('Publish')}
        </PrimaryButton>
      </DrawerFooter>
    </AdDrawer>
  )
}

export function BurnDrawer({ad, ...props}) {
  const {t} = useTranslation()

  const toast = useSuccessToast()
  const failToast = useFailToast()

  const {coinbase} = useAuthState()

  const burnMutation = useMutation(async () => 0) // useBurnDna({ad, from: coinbase})

  const dna = useFormatDna()

  return (
    <Drawer {...props}>
      <DrawerHeader>
        <Stack spacing={4}>
          <FillCenter
            alignSelf="flex-start"
            bg="blue.012"
            w={12}
            minH={12}
            rounded="xl"
          >
            <AdsIcon boxSize={6} color="blue.500" />
          </FillCenter>
          <Heading fontSize="lg" fontWeight={500}>
            {t('Burn')}
          </Heading>
        </Stack>
      </DrawerHeader>
      <DrawerBody overflowY="auto" mx={-6} mb={10}>
        <Stack spacing={6} color="brandGray.500" fontSize="md" p={6} pt={0}>
          <Text>{t(`Burn iDNA to make your ad visible.`)}</Text>
          <Stack spacing={6} bg="gray.50" p={6} rounded="lg">
            <Stack isInline spacing={5}>
              <AdCoverImage ad={ad} w="10" />
              <Box>
                <Text fontWeight={500}>{ad.title}</Text>
                <ExternalLink href={ad.url}>{ad.url}</ExternalLink>
              </Box>
            </Stack>
            <Stack spacing={3}>
              <HDivider />
              <Stack>
                <InlineAdStat label="Competitors" value={Number(0)} />
                <InlineAdStat label="Max price" value={dna(0)} />
              </Stack>
              <HDivider />
              <Stack>
                <SmallInlineAdStat label="Language" value={ad.language} />
                <SmallInlineAdStat label="Stake" value={ad.stake} />
                <SmallInlineAdStat label="Age" value={ad.age} />
                <SmallInlineAdStat label="OS" value={ad.os} />
              </Stack>
            </Stack>
          </Stack>
          <form
            id="burnForm"
            onSubmit={e => {
              e.preventDefault()

              const formData = new FormData(e.target)

              const amount = Number(formData.get('amount'))

              burnMutation.mutate(amount, {
                onSuccess: () => {
                  toast(`${amount} iDNA 🔥🔥🔥`)
                  props.onClose()
                },
                onError: failToast,
              })
            }}
          >
            <FormControl>
              <Stack spacing={3}>
                <FormLabel htmlFor="amount" mb={0}>
                  {t('Amount, iDNA')}
                </FormLabel>
                <Input id="amount" name="amount" />
              </Stack>
            </FormControl>
          </form>
        </Stack>
      </DrawerBody>
      <DrawerFooter
        borderWidth={1}
        borderColor="gray.100"
        py={3}
        px={4}
        position="absolute"
        left={0}
        right={0}
        bottom={0}
      >
        <PrimaryButton type="submit" form="burnForm">
          {t('Burn')}
        </PrimaryButton>
      </DrawerFooter>
    </Drawer>
  )
}

export function AdListItem({ad, onReview, onPublish, onBurn}) {
  const {t, i18n} = useTranslation()

  const router = useRouter()

  const dna = useFormatDna()

  const toast = useSuccessToast()

  const {
    id,
    title,
    language,
    age,
    os,
    stake,
    status,
    votingAddress,
    isPublished,
    result: votingResult,
  } = ad

  const {data: burntCoins} = {data: []} // useBurntCoins()

  const isDraft = status === AdStatus.Draft

  const {encodeAdKey} = {encodeAdKey: x => x} // useProfileProtoEncoder()

  const competitors =
    burntCoins?.filter(
      coin =>
        coin.key === encodeAdKey && encodeAdKey({language, age, os, stake})
    ) ?? []

  const competitorCount = competitors.length
  const maxCompetitorPrice = Math.max(competitors.map(x => x.amount ?? 0))

  return (
    <HStack key={id} spacing="5" align="flex-start">
      <Stack spacing={2} w="16" flexShrink={0}>
        <Box position="relative">
          <AdCoverImage
            ad={ad}
            fallbackSrc={isDraft ? '/static/body-medium-pic-icn.svg' : null}
            ignoreFallback={!isDraft}
          />
          {isApprovedAd({status}) && <AdOverlayStatus status={status} />}
        </Box>
        <AdStatusText status={status} />
      </Stack>
      <Box flex={1}>
        <Flex justify="space-between">
          <TextLink
            href={`/ads/${isPublished ? `view` : `edit`}?id=${id}`}
            color="gray.500"
            fontSize="mdx"
            fontWeight={500}
            _hover={{color: 'muted'}}
          >
            {title}
          </TextLink>

          <Stack isInline align="center">
            <Box>
              <Menu>
                <NextLink href={`/ads/edit?id=${id}`} passHref>
                  <MenuItem
                    isDisabled={isPublished}
                    icon={<EditIcon boxSize={5} color="blue.500" />}
                  >
                    {t('Edit')}
                  </MenuItem>
                </NextLink>
                <MenuDivider />
                <MenuItem
                  icon={<DeleteIcon boxSize={5} />}
                  color="red.500"
                  onClick={() => {
                    // remove(id)
                  }}
                >
                  {t('Delete')}
                </MenuItem>
              </Menu>
            </Box>

            {isPublished && isApprovedAd({status}) && (
              <SecondaryButton onClick={onBurn}>{t('Burn')}</SecondaryButton>
            )}

            {!isPublished && isApprovedAd({status}) && (
              <SecondaryButton onClick={onPublish}>
                {t('Publish')}
              </SecondaryButton>
            )}

            {status === AdStatus.Draft && (
              <SecondaryButton onClick={onReview}>
                {t('Review')}
              </SecondaryButton>
            )}

            {isReviewingAd({status}) && (
              <SecondaryButton
                onClick={async () => {
                  toast({
                    title: ad.status,
                    onAction: () => {
                      router.push(viewVotingHref(votingAddress))
                    },
                    actionContent: t('View details'),
                  })
                }}
              >
                {t('Check status')}
              </SecondaryButton>
            )}
          </Stack>
        </Flex>
        <Stack isInline spacing={16}>
          <BlockAdStat label="Competitors" value={competitorCount} flex={0} />
          <BlockAdStat
            label="Max competitor price"
            value={dna(maxCompetitorPrice)}
          />
        </Stack>

        <HStack spacing={4} bg="gray.50" p={2} mt="5" rounded="md">
          <Stack flex={1} isInline px={2} pt={1}>
            <InlineAdStatGroup spacing="1.5" labelWidth={14} flex={1}>
              <SmallInlineAdStat label="Language" value={language} />
              <SmallInlineAdStat label="Stake" value={stake} />
            </InlineAdStatGroup>
            <InlineAdStatGroup spacing="1.5" labelWidth={6} flex={1}>
              <SmallInlineAdStat label="Age" value={age} />
              <SmallInlineAdStat label="OS" value={os || 'Any'} />
            </InlineAdStatGroup>
          </Stack>

          <VDivider minH={68} h="full" />

          <Stack flex={1} justify="center">
            <InlineAdStatGroup spacing="1.5" labelWidth={24} flex={1}>
              <SmallInlineAdStat
                label="Voting address"
                value={votingAddress ?? '--'}
              />
              <SmallInlineAdStat
                label="Voting status"
                value={
                  Object.keys(AdVotingOptionId).find(
                    key => AdVotingOptionId[key] === votingResult
                  ) ?? '--'
                }
                sx={{
                  '& dd': {
                    textTransform: 'capitalize',
                  },
                }}
              />
            </InlineAdStatGroup>
          </Stack>
        </HStack>
      </Box>
    </HStack>
  )
}
