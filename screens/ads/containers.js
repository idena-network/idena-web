import React from 'react'
import NextLink from 'next/link'
import {
  Flex,
  HStack,
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
  InputGroup,
  Image,
  Modal,
  ModalContent,
  ModalCloseButton,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {TriangleUpIcon, ViewIcon} from '@chakra-ui/icons'
import {
  Avatar,
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
  SmallText,
} from '../../shared/components/components'
import {
  useCurrentRotatingAd,
  useRotatingAds,
  useRotateAd,
  useAdStatusColor,
  useAdStatusText,
  useFormatDna,
  useReviewAd,
  useDeployVotingAmount,
  useStartAdVotingAmount,
  useBalance,
  useCoinbase,
  usePublishAd,
  useBurnAd,
  useCompetingAdsByTarget,
  useBurntCoins,
  useAdErrorToast,
} from './hooks'
import {
  AdsIcon,
  DeleteIcon,
  EditIcon,
  LaptopIcon,
  OracleIcon,
  PicIcon,
} from '../../shared/components/icons'
import {useSuccessToast, useFailToast} from '../../shared/hooks/use-toast'
import {
  AdFormField,
  AdStatLabel,
  AdStatNumber,
  FormSection,
  FormSectionTitle,
  AdImage,
  InputCharacterCount,
  AdNumberInput,
  MiningBadge,
} from './components'
import {Fill} from '../../shared/components'
import {hasImageType} from '../../shared/utils/img'
import {
  IconButton,
  PrimaryButton,
  SecondaryButton,
} from '../../shared/components/button'
import {AVAILABLE_LANGS} from '../../i18n'
import {fetchAdVoting, mapVotingToAdStatus, OS} from './utils'
import {AdRotationStatus, AdStatus} from './types'
import {viewVotingHref} from '../oracles/utils'
import db from '../../shared/utils/db'
import {AdTarget} from '../../shared/models/adKey'
import {AdBurnKey} from '../../shared/models/adBurnKey'
import {capitalize} from '../../shared/utils/string'
import {useIdentity} from '../../shared/providers/identity-context'

export function AdBanner() {
  const {t} = useTranslation()

  const router = useRouter()

  const activeAd = useCurrentRotatingAd()

  return (
    <Flex
      align="center"
      justify="space-between"
      borderBottomWidth={1}
      borderBottomColor="gray.100"
      p="2"
      pr="4"
      h="14"
    >
      <AdBannerContent ad={activeAd} />
      <HStack spacing="10">
        <AdBannerAuthor ad={activeAd} />
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
      </HStack>
    </Flex>
  )
}

function AdBannerContent({ad}) {
  return (
    <LinkBox as={HStack} spacing={2}>
      <Skeleton isLoaded={Boolean(ad?.thumb)}>
        <AdImage src={ad?.thumb} w={10} />
      </Skeleton>
      <Stack spacing="0.5" fontWeight={500}>
        <Skeleton isLoaded={Boolean(ad?.title)} minH={4} w="md">
          <LinkOverlay href={ad?.url} target="_blank">
            <Text lineHeight={4} isTruncated>
              {ad?.title}
            </Text>
          </LinkOverlay>
        </Skeleton>
        <Skeleton isLoaded={Boolean(ad?.desc)} minH={4} minW="lg">
          <Text fontSize="sm" color="muted" lineHeight={4} isTruncated>
            {ad?.desc}
          </Text>
        </Skeleton>
      </Stack>
    </LinkBox>
  )
}

function AdBannerAuthor({ad, ...props}) {
  const {t} = useTranslation()

  return (
    <HStack spacing="4" {...props}>
      <VDivider h="9" />
      <Stack spacing="0.5" fontWeight={500}>
        <Text>{t('Sponsored by')}</Text>
        <HStack spacing="1">
          <Avatar
            address={ad?.author}
            size={4}
            borderWidth={1}
            borderColor="gray.016"
            rounded="sm"
          />
          <Skeleton isLoaded={Boolean(ad?.author)}>
            <Text color="muted" fontSize="sm" w="24" lineHeight="4" isTruncated>
              {ad?.author}
            </Text>
          </Skeleton>
        </HStack>
      </Stack>
    </HStack>
  )
}

export function AdListItem({ad, onReview, onPublish, onBurn, onRemove}) {
  const {id, cid, title, language, age, os, stake, status, contract} = ad

  const {t, i18n} = useTranslation()

  const router = useRouter()

  const toast = useSuccessToast()

  const formatDna = useFormatDna()

  const {data: competingAds} = useCompetingAdsByTarget(
    cid,
    new AdTarget({language, age, os, stake})
  )

  const competitorCount = competingAds?.length
  const maxCompetitor = competingAds?.sort((a, b) => b.amount - a.amount)[0]

  const {data: burntCoins} = useBurntCoins()

  const orderedBurntCoins =
    burntCoins
      ?.sort((a, b) => b.amount - a.amount)
      .map(burn => ({...burn, ...AdBurnKey.fromHex(burn?.key)})) ?? []

  const burnIndex = orderedBurntCoins.findIndex(burn => burn.cid === cid)
  const burnAmount = orderedBurntCoins[burnIndex]

  const rotationStatus =
    // eslint-disable-next-line no-nested-ternary
    burnIndex > -1
      ? burnIndex > 3
        ? AdRotationStatus.PartiallyShowing
        : AdRotationStatus.Showing
      : AdRotationStatus.NotShowing

  const [currentStatus, setCurrentStatus] = React.useState()

  const eitherStatus = (...statuses) => statuses.includes(status)

  return (
    <HStack key={id} spacing="5" align="flex-start">
      <Stack spacing="2" w="60px" flexShrink={0}>
        <Box position="relative">
          <AdImage src={ad.thumb && URL.createObjectURL(ad.thumb)} />
          {status === AdStatus.Approved && (
            <AdOverlayStatus status={rotationStatus} />
          )}
        </Box>
        {status === AdStatus.Approved && (
          <AdStatusText status={rotationStatus} />
        )}
      </Stack>
      <Stack spacing="5" w="full">
        <Flex justify="space-between">
          <Stack spacing="1">
            <TextLink
              href={
                status === AdStatus.Approved
                  ? `/ads/view?cid=${cid}`
                  : `/ads/edit?id=${id}`
              }
              color="gray.500"
              fontSize="mdx"
              fontWeight={500}
              lineHeight="shorter"
              _hover={{color: 'muted'}}
            >
              {title}
            </TextLink>
            <Text color="muted">{ad.desc}</Text>
          </Stack>

          <Stack isInline align="center">
            <Box>
              <Menu>
                {eitherStatus(
                  AdStatus.Reviewing,
                  AdStatus.Approved,
                  AdStatus.Rejected
                ) && (
                  <NextLink href={`/ads/view?cid=${cid}`} passHref>
                    <MenuItem icon={<ViewIcon boxSize={5} color="blue.500" />}>
                      {t('View')}
                    </MenuItem>
                  </NextLink>
                )}
                {eitherStatus(AdStatus.Draft) && (
                  <NextLink href={`/ads/edit?id=${id}`} passHref>
                    <MenuItem icon={<EditIcon boxSize={5} color="blue.500" />}>
                      {t('Edit')}
                    </MenuItem>
                  </NextLink>
                )}
                <MenuDivider />
                <MenuItem
                  icon={<DeleteIcon boxSize={5} />}
                  color="red.500"
                  onClick={async () => {
                    await db.table('ads').delete(id)
                    if (onRemove) onRemove()
                  }}
                >
                  {t('Delete')}
                </MenuItem>
              </Menu>
            </Box>

            {status === AdStatus.Approved && (
              <SecondaryButton onClick={onBurn}>{t('Burn')}</SecondaryButton>
            )}

            {currentStatus === AdStatus.Approved && (
              <SecondaryButton onClick={onPublish}>
                {t('Publish')}
              </SecondaryButton>
            )}

            {status === AdStatus.Draft && (
              <SecondaryButton onClick={onReview}>
                {t('Review')}
              </SecondaryButton>
            )}

            {status === AdStatus.Reviewing && (
              <SecondaryButton
                onClick={async () => {
                  const voting = await fetchAdVoting(contract)

                  // eslint-disable-next-line no-shadow
                  const currentStatus = mapVotingToAdStatus(voting) ?? status

                  setCurrentStatus(currentStatus)

                  if (currentStatus === AdStatus.Rejected) {
                    await db
                      .table('ads')
                      .update(id, {status: AdStatus.Rejected})
                  }

                  toast({
                    title: capitalize(currentStatus ?? 'currentStatus'),
                    onAction: () => {
                      router.push(viewVotingHref(contract))
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
            <InlineAdStatGroup spacing="2" labelWidth="28" flex={1}>
              <InlineAdStat
                label={t('Burnt, {{time}}', {
                  time: new Intl.RelativeTimeFormat(i18n.language, {
                    style: 'short',
                  }).format(24, 'hour'),
                })}
                value={burnAmount ? formatDna(burnAmount.amount) : '--'}
                flex={0}
              />
              <InlineAdStat
                label="Competitors"
                value={status === AdStatus.Approved ? competitorCount : '--'}
                flex={0}
              />
              <InlineAdStat
                label="Max price"
                value={maxCompetitor ? formatDna(maxCompetitor.amount) : '--'}
              />
            </InlineAdStatGroup>
          </Stack>
        </HStack>
      </Stack>
    </HStack>
  )
}

export function AdDrawer({isMining = true, children, ...props}) {
  const ads = useRotatingAds()

  const hasRotatingAds = ads.length > 0

  const {currentIndex, prev, next, setCurrentIndex} = useRotateAd()

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

function AdPromotion({cid, title, desc, url, media, author}) {
  const {t, i18n} = useTranslation()

  const {data: burntCoins} = useBurntCoins()

  const orderedBurntCoins =
    burntCoins
      ?.sort((a, b) => b.amount - a.amount)
      .map(burn => ({...burn, ...AdBurnKey.fromHex(burn?.key)})) ?? []

  const maybeBurn = orderedBurntCoins.find(burn => burn.cid === cid)

  const formatDna = useFormatDna()

  return (
    <Stack
      spacing="10"
      bg="white"
      rounded="lg"
      px={10}
      pt={37}
      pb={44}
      w={400}
      h={660}
    >
      <Stack spacing="4">
        <Stack spacing="2">
          <Skeleton isLoaded={Boolean(title)} minH={5} w={3 / 4}>
            <Heading
              as="h4"
              fontWeight="semibold"
              fontSize="md"
              lineHeight="5"
              isTruncated
            >
              {title}
            </Heading>
          </Skeleton>

          <Stack spacing="1.5" minH={62}>
            <Skeleton isLoaded={Boolean(desc)} minH={5}>
              <Text color="muted" fontSize="md" lineHeight="5">
                {desc}
              </Text>
            </Skeleton>
            <Skeleton isLoaded={Boolean(url)} w={1 / 4} h={4}>
              <ExternalLink
                href={url}
                fontWeight="semibold"
                display="flex"
                textProps={{h: '4', lineHeight: '4'}}
              >
                {url}
              </ExternalLink>
            </Skeleton>
          </Stack>
        </Stack>

        <AdImage src={media} w={320} objectFit="cover" />
      </Stack>
      <Stack spacing="6">
        <HStack spacing="10">
          <Stat>
            <AdStatLabel color="gray.500" fontWeight={500} lineHeight={4}>
              {t('Sponsored by')}
            </AdStatLabel>
            <AdStatNumber color="muted" fontSize="sm" mt="1.5" h="4">
              <HStack spacing="1" align="center">
                <Avatar address={author} boxSize={4} />
                <Text as="span" maxW="36" isTruncated>
                  {author}
                </Text>
              </HStack>
            </AdStatNumber>
          </Stat>
          <Stat>
            <AdStatLabel color="gray.500" fontWeight={500} lineHeight={4}>
              {t('Burnt, {{time}}', {
                time: new Intl.RelativeTimeFormat(i18n.language, {
                  style: 'short',
                }).format(24, 'hour'),
              })}
            </AdStatLabel>
            <AdStatNumber color="muted" fontSize="sm" mt="1.5" h="4">
              {formatDna(maybeBurn?.amount ?? 0)}
            </AdStatNumber>
          </Stat>
        </HStack>
        <SuccessAlert fontSize="md">
          {t('Watching ads makes your coin valuable!')}
        </SuccessAlert>
      </Stack>
    </Stack>
  )
}

export const AdForm = React.forwardRef(function AdForm(
  {ad, onSubmit, ...props},
  ref
) {
  const {t} = useTranslation()

  const [thumb, setThumb] = React.useState(ad?.thumb)
  const [media, setMedia] = React.useState(ad?.media)

  const [titleCharacterCount, setTitleCharacterCount] = React.useState(40)
  const [descCharacterCount, setDescCharacterCount] = React.useState(70)

  return (
    <form
      ref={ref}
      onChange={e => {
        const {name, value} = e.target

        if (name === 'title') {
          setTitleCharacterCount(40 - value.length)
        }

        if (name === 'desc') {
          setDescCharacterCount(70 - value.length)
        }
      }}
      onSubmit={e => {
        e.preventDefault()

        if (onSubmit) {
          const formData = new FormData(e.target)
          onSubmit(Object.fromEntries(formData.entries()))
        }
      }}
      {...props}
    >
      <Stack spacing={6} w="mdx">
        <FormSection>
          <FormSectionTitle>{t('Content')}</FormSectionTitle>
          <Stack spacing={3}>
            <AdFormField label={t('Title')} isRequired>
              <InputGroup>
                <Input name="title" defaultValue={ad?.title} maxLength={40} />
                <InputCharacterCount>{titleCharacterCount}</InputCharacterCount>
              </InputGroup>
            </AdFormField>
            <AdFormField label={t('Description')} isRequired>
              <InputGroup>
                <Textarea
                  name="desc"
                  defaultValue={ad?.desc}
                  maxLength={70}
                  resize="none"
                />
                <InputCharacterCount>{descCharacterCount}</InputCharacterCount>
              </InputGroup>
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
          <FormSectionTitle>{t('Media')}</FormSectionTitle>
          <HStack spacing="10">
            <Box flex={1}>
              <AdMediaInput
                name="media"
                value={media}
                label={t('Upload media')}
                description={t('640x640px, no more than 1 Mb')}
                fallbackSrc="/static/upload-cover-icn.svg"
                onChange={setMedia}
              />
            </Box>
            <Box flex={1}>
              <AdMediaInput
                name="thumb"
                value={thumb}
                label={t('Upload thumb')}
                description={t('80x80px, no more than 1 Mb')}
                fallbackSrc="/static/upload-thumbnail-icn.svg"
                onChange={setThumb}
              />
            </Box>
          </HStack>
        </FormSection>
        <FormSection>
          <FormSectionTitle>{t('Target audience')}</FormSectionTitle>
          <Stack spacing={3} shouldWrapChildren>
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
              <AdNumberInput
                name="age"
                defaultValue={ad?.age}
                min={0}
                max={Number.MAX_SAFE_INTEGER}
              />
            </AdFormField>
            <AdFormField label="Stake">
              <AdNumberInput
                name="stake"
                defaultValue={ad?.stake}
                min={0}
                max={Number.MAX_SAFE_INTEGER}
                addon={t('iDNA')}
              />
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
    </form>
  )
})

export function AdMediaInput({
  value,
  label,
  description,
  fallbackSrc,
  onChange,
  ...props
}) {
  const src = React.useMemo(() => value && URL.createObjectURL(value), [value])

  return (
    <FormLabel m={0} p={0}>
      <VisuallyHiddenInput
        type="file"
        accept="image/png,image/jpg,image/jpeg,image/webp"
        onChange={async e => {
          if (onChange) {
            const {files} = e.target
            if (files.length) {
              const [file] = files
              if (hasImageType(file)) {
                onChange(file)
              }
            }
          }
        }}
        {...props}
      />
      <HStack spacing={4} align="center">
        <Box flexShrink={0}>
          {value ? (
            <AdImage src={src} width={70} />
          ) : (
            <Center
              bg="gray.50"
              borderWidth={1}
              borderColor="gray.016"
              rounded="lg"
              p="3"
            >
              <Image src={fallbackSrc} ignoreFallback boxSize="44px" />
            </Center>
          )}
        </Box>
        <Stack>
          <HStack>
            <LaptopIcon boxSize="5" color="blue.500" />
            <Text color="blue.500" fontWeight={500}>
              {label}
            </Text>
          </HStack>
          <SmallText>{description}</SmallText>
        </Stack>
      </HStack>
    </FormLabel>
  )
}

export function ReviewAdDrawer({ad, onSendToReview, ...props}) {
  const {t} = useTranslation()

  const coinbase = useCoinbase()

  const balance = useBalance(coinbase)

  const {
    storeToIpfsData,
    storeToIpfsError,
    estimateDeployData,
    estimateDeployError,
    deployError,
    estimateStartVotingError,
    startVotingError,
    isPending,
    isDone,
    submit,
  } = useReviewAd()

  React.useEffect(() => {
    if (isDone && onSendToReview) {
      onSendToReview({
        cid: storeToIpfsData?.cid,
        contract: estimateDeployData?.receipt?.contract,
      })
    }
  }, [storeToIpfsData, estimateDeployData, isDone, onSendToReview])

  const reviewError = React.useMemo(
    () =>
      storeToIpfsError ??
      estimateDeployError ??
      deployError ??
      estimateStartVotingError ??
      startVotingError,
    [
      deployError,
      estimateDeployError,
      estimateStartVotingError,
      startVotingError,
      storeToIpfsError,
    ]
  )

  useAdErrorToast(reviewError)

  const {data: deployAmount} = useDeployVotingAmount()

  const {data: startAmount} = useStartAdVotingAmount()

  const failToast = useFailToast()

  const formatDna = useFormatDna()

  return (
    <AdDrawer isMining={isPending} {...props}>
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

            {isPending && <MiningBadge>{t('Mining...')}</MiningBadge>}
          </Stack>
          <Stack spacing={6} bg="gray.50" p={6} rounded="lg">
            <Stack isInline spacing={5}>
              <AdImage src={ad.thumb && URL.createObjectURL(ad.thumb)} w="10" />
              <Box>
                <Text fontWeight={500}>{ad.title}</Text>
                <ExternalLink href={ad.url}>{ad.url}</ExternalLink>
              </Box>
            </Stack>
            <Stack spacing={3}>
              <HDivider />
              <InlineAdStatGroup labelWidth="20">
                <SmallInlineAdStat label="Language" value={ad.language} />
                <SmallInlineAdStat label="Stake" value={ad.stake} />
                <SmallInlineAdStat label="Age" value={ad.age} />
                <SmallInlineAdStat label="OS" value={ad.os} />
              </InlineAdStatGroup>
            </Stack>
          </Stack>
          <form
            id="reviewForm"
            onSubmit={async e => {
              e.preventDefault()

              if (deployAmount && startAmount) {
                const requiredAmount = deployAmount + startAmount

                if (balance > requiredAmount) {
                  submit({
                    ...ad,
                    thumb: new Uint8Array(await ad.thumb.arrayBuffer()),
                    media: new Uint8Array(await ad.media.arrayBuffer()),
                  })
                } else {
                  failToast(
                    t(
                      `Insufficient funds to start reviewing ad. Please deposit at least {{missingAmount}}.`,
                      {
                        missingAmount: formatDna(
                          Math.abs(balance - requiredAmount)
                        ),
                      }
                    )
                  )
                }
              }
            }}
          >
            <Stack spacing={4}>
              <FormControl isDisabled isReadOnly>
                <Stack spacing={3}>
                  <FormLabel htmlFor="stake" mb={0}>
                    {t('Min stake, iDNA')}
                  </FormLabel>
                  <Input defaultValue={deployAmount} />
                </Stack>
              </FormControl>
              <FormControl isDisabled isReadOnly>
                <Stack spacing={3}>
                  <FormLabel htmlFor="oracleFee" mb={0}>
                    {t('Review fee, iDNA')}
                  </FormLabel>
                  <Input defaultValue={startAmount} />
                </Stack>
              </FormControl>
            </Stack>
          </form>
        </Stack>
      </DrawerBody>
      <DrawerFooter bg="white">
        <HStack>
          {/* eslint-disable-next-line react/destructuring-assignment */}
          <SecondaryButton onClick={props.onClose}>
            {t('Not now')}
          </SecondaryButton>
          <PrimaryButton
            type="submit"
            form="reviewForm"
            isLoading={isPending}
            loadingText={t('Mining...')}
          >
            {t('Send')}
          </PrimaryButton>
        </HStack>
      </DrawerFooter>
    </AdDrawer>
  )
}

export function PublishAdDrawer({ad, onPublish, ...props}) {
  const {t} = useTranslation()

  const formatDna = useFormatDna()

  const failToast = useFailToast()

  const [{address}] = useIdentity()

  const balance = useBalance(address)

  const {
    storeToIpfsError,
    changeProfileError,
    isPending,
    isDone,
    submit,
  } = usePublishAd()

  React.useEffect(() => {
    if (isDone && onPublish) {
      onPublish()
    }
  }, [isDone, onPublish])

  const publishError = React.useMemo(
    () => storeToIpfsError ?? changeProfileError,
    [changeProfileError, storeToIpfsError]
  )

  useAdErrorToast(publishError)

  const {data: competingAds} = useCompetingAdsByTarget(ad.cid, new AdTarget(ad))

  const competitorCount = competingAds?.length
  const maxCompetitor = competingAds?.sort((a, b) => b.amount - a.amount)[0]

  return (
    <AdDrawer isMining={isPending} {...props}>
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
        <Stack spacing="6" color="brandGray.500" fontSize="md" p={6} pt={0}>
          <Stack spacing="3">
            <Text>{t('Your ad is about to be published')}</Text>

            {isPending && <MiningBadge>{t('Mining...')}</MiningBadge>}
          </Stack>

          <Stack spacing="6" bg="gray.50" p={6} rounded="lg">
            <Stack isInline spacing={5}>
              <AdImage src={URL.createObjectURL(ad.thumb)} w="10" />
              <Box>
                <Text fontWeight={500}>{ad.title}</Text>
                <ExternalLink href={ad.url}>{ad.url}</ExternalLink>
              </Box>
            </Stack>
            <Stack spacing={3}>
              <HDivider />
              <InlineAdStatGroup labelWidth="24">
                <InlineAdStat
                  label={t('Competitors')}
                  value={competitorCount}
                />
                <InlineAdStat
                  label={t('Max price')}
                  value={maxCompetitor ? formatDna(maxCompetitor.amount) : '--'}
                />
              </InlineAdStatGroup>
              <HDivider />
              <InlineAdStatGroup labelWidth="20">
                <SmallInlineAdStat label={t('Language')} value={ad.language} />
                <SmallInlineAdStat label={t('Stake')} value={ad.stake} />
                <SmallInlineAdStat label={t('Age')} value={ad.age} />
                <SmallInlineAdStat label={t('OS')} value={ad.os} />
              </InlineAdStatGroup>
            </Stack>
          </Stack>
        </Stack>
      </DrawerBody>
      <DrawerFooter>
        <PrimaryButton
          isLoading={isPending}
          loadingText={t('Mining...')}
          onClick={() => {
            if (balance > 0) {
              submit(ad)
            } else {
              failToast(t('Insufficient funds to publish ad'))
            }
          }}
        >
          {t('Publish')}
        </PrimaryButton>
      </DrawerFooter>
    </AdDrawer>
  )
}

export function BurnDrawer({ad, onBurn, ...props}) {
  const {t} = useTranslation()

  const [{address}] = useIdentity()

  const balance = useBalance(address)

  const {error, isPending, isDone, submit} = useBurnAd()

  React.useEffect(() => {
    if (isDone && onBurn) {
      onBurn()
    }
  }, [isDone, onBurn])

  useAdErrorToast(error)

  const failToast = useFailToast()

  const formatDna = useFormatDna()

  const {data: competingAds} = useCompetingAdsByTarget(ad.cid, new AdTarget(ad))

  const competitorCount = competingAds?.length
  const maxCompetitor = competingAds?.sort((a, b) => b.amount - a.amount)[0]

  return (
    <AdDrawer isMining={isPending} {...props}>
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
        <Stack spacing="6" color="brandGray.500" fontSize="md" p={6} pt={0}>
          <Stack spacing="3">
            <Text>{t('Burn iDNA to make your ad visible.')}</Text>
            {isPending && <MiningBadge>{t('Mining...')}</MiningBadge>}
          </Stack>

          <Stack spacing="6" bg="gray.50" p={6} rounded="lg">
            <Stack isInline spacing={5}>
              <AdImage src={URL.createObjectURL(ad.thumb)} w="10" />
              <Box>
                <Text fontWeight={500}>{ad.title}</Text>
                <ExternalLink href={ad.url}>{ad.url}</ExternalLink>
              </Box>
            </Stack>
            <Stack spacing={3}>
              <HDivider />
              <InlineAdStatGroup labelWidth="24">
                <InlineAdStat
                  label={t('Competitors')}
                  value={competitorCount}
                />
                <InlineAdStat
                  label={t('Max price')}
                  value={maxCompetitor ? formatDna(maxCompetitor.amount) : '--'}
                />
              </InlineAdStatGroup>
              <HDivider />
              <InlineAdStatGroup labelWidth="20">
                <SmallInlineAdStat label={t('Language')} value={ad.language} />
                <SmallInlineAdStat label={t('Stake')} value={ad.stake} />
                <SmallInlineAdStat label={t('Age')} value={ad.age} />
                <SmallInlineAdStat label={t('OS')} value={ad.os} />
              </InlineAdStatGroup>
            </Stack>
          </Stack>
          <form
            id="burnForm"
            onSubmit={e => {
              e.preventDefault()

              const amount = Number(new FormData(e.target).get('amount'))

              if (amount <= 0) {
                console.log({amount})
                failToast(t('Please burn more than 0 coins'))
              } else if (amount > balance) {
                failToast(
                  t('Insufficient funds to burn {{amount}}', {
                    amount: formatDna(amount),
                  })
                )
              } else {
                submit({ad, amount})
              }
            }}
          >
            <FormControl>
              <Stack spacing={3}>
                <FormLabel htmlFor="amount" mb={0}>
                  {t('Amount, iDNA')}
                </FormLabel>
                <AdNumberInput
                  name="amount"
                  min={0}
                  max={Number.MAX_SAFE_INTEGER}
                  addon={t('iDNA')}
                />
              </Stack>
            </FormControl>
          </form>
        </Stack>
      </DrawerBody>
      <DrawerFooter>
        <PrimaryButton
          type="submit"
          form="burnForm"
          isLoading={isPending}
          loadingText={t('Mining...')}
        >
          {t('Burn')}
        </PrimaryButton>
      </DrawerFooter>
    </AdDrawer>
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
    <Stat flex={0} lineHeight="4" sx={{'& > dl': {display: 'flex'}}} {...props}>
      {label && <AdStatLabel width={labelWidth}>{label}</AdStatLabel>}
      {(value || Number.isFinite(value)) && (
        <AdStatNumber>{value}</AdStatNumber>
      )}
      {children}
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
      rounded="lg"
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

export function AdPreview({ad, ...props}) {
  return (
    <Modal size="full" {...props}>
      <ModalContent bg="xblack.080" fontSize="md">
        <Box bg="white" p="2" pr="4">
          <Flex justifyContent="space-between">
            <AdBannerContent ad={ad} />
            <HStack spacing="10" align="center">
              <AdBannerAuthor ad={ad} />
              <ModalCloseButton position="initial" />
            </HStack>
          </Flex>
        </Box>
        <Center flex={1}>
          <AdPromotion {...ad} />
        </Center>
      </ModalContent>
    </Modal>
  )
}