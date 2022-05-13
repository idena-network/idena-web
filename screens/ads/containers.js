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
  FormHelperText,
  Tr,
  Td,
  Link,
  useBoolean,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {ChevronRightIcon, TriangleUpIcon, ViewIcon} from '@chakra-ui/icons'
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
  Debug,
  Tooltip,
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
  useCompetingAds,
  useBurntCoins,
  useProtoProfileDecoder,
  useIpfsAd,
} from './hooks'
import {
  AdsIcon,
  DeleteIcon,
  EditIcon,
  InfoIcon,
  LaptopIcon,
  OracleIcon,
  PicIcon,
} from '../../shared/components/icons'
import {useFailToast} from '../../shared/hooks/use-toast'
import {
  AdFormField,
  AdStatLabel,
  AdStatNumber,
  FormSection,
  FormSectionTitle,
  AdImage,
  InputCharacterCount,
  AdNumberInput,
  AdFormError,
} from './components'
import {Fill} from '../../shared/components'
import {hasImageType} from '../../shared/utils/img'
import {
  IconButton,
  PrimaryButton,
  SecondaryButton,
} from '../../shared/components/button'
import {AVAILABLE_LANGS} from '../../i18n'
import {
  adFallbackSrc,
  adImageThumbSrc,
  compressAdImage,
  isValidImage,
  OS,
  validateAd,
} from './utils'
import {AdRotationStatus, AdStatus} from './types'
import {viewVotingHref} from '../oracles/utils'
import db from '../../shared/utils/db'
import {AdTarget} from '../../shared/models/adKey'
import {AdBurnKey} from '../../shared/models/adBurnKey'
import {useIdentity} from '../../shared/providers/identity-context'
import {pick} from '../../shared/utils/utils'

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
                router.push(`/adn/list`)
              }}
            >
              {t('My Ads')}
            </MenuItem>
          )}
          <NextLink href="/adn/offers">
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

export function AdListItem({
  ad,
  onReview,
  onPublish,
  onBurn,
  onRemove,
  onPreview,
}) {
  const {id, cid, title, language, age, os, stake, status, contract} = ad

  const {t, i18n} = useTranslation()

  const formatDna = useFormatDna()

  const {data: competingAds} = useCompetingAds(
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
    burnIndex > -1 ? AdRotationStatus.Showing : AdRotationStatus.NotShowing

  const eitherStatus = (...statuses) => statuses.includes(status)

  return (
    <HStack key={id} spacing="5" align="flex-start">
      <Stack spacing="2" w="60px" flexShrink={0}>
        <Box position="relative">
          <AdImage src={adImageThumbSrc(ad)} />
          {status === AdStatus.Published && (
            <AdOverlayStatus status={rotationStatus} />
          )}
        </Box>
        {status === AdStatus.Published && (
          <AdStatusText status={rotationStatus} />
        )}
      </Stack>
      <Stack spacing="5" w="full">
        <Flex justify="space-between">
          <Stack spacing="1">
            {eitherStatus(
              AdStatus.Reviewing,
              AdStatus.Approved,
              AdStatus.Published
            ) ? (
              <Text
                color="gray.500"
                fontSize="mdx"
                fontWeight={500}
                lineHeight="shorter"
              >
                {title}
              </Text>
            ) : (
              <TextLink
                href={`/adn/edit?id=${id}`}
                color="gray.500"
                fontSize="mdx"
                fontWeight={500}
                lineHeight="shorter"
                _hover={{color: 'muted'}}
              >
                {title}
              </TextLink>
            )}
            <Text color="muted">{ad.desc}</Text>
          </Stack>

          <Stack isInline align="center">
            <Box>
              <Menu>
                {eitherStatus(
                  AdStatus.Reviewing,
                  AdStatus.Approved,
                  AdStatus.Published,
                  AdStatus.Rejected
                ) && (
                  <MenuItem
                    icon={<ViewIcon boxSize={5} color="blue.500" />}
                    onClick={onPreview}
                  >
                    {t('Preview')}
                  </MenuItem>
                )}
                {eitherStatus(AdStatus.Draft, AdStatus.Rejected) && (
                  <>
                    <NextLink href={`/adn/edit?id=${id}`} passHref>
                      <MenuItem
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
                        // eslint-disable-next-line no-unused-expressions
                        onRemove?.(ad)
                      }}
                    >
                      {t('Delete')}
                    </MenuItem>
                  </>
                )}
              </Menu>
            </Box>

            {status === AdStatus.Published && (
              <SecondaryButton onClick={onBurn}>{t('Burn')}</SecondaryButton>
            )}

            {status === AdStatus.Approved && (
              <SecondaryButton onClick={onPublish}>
                {t('Create campaign')}
              </SecondaryButton>
            )}

            {status === AdStatus.Draft && (
              <SecondaryButton onClick={onReview}>
                {t('Review')}
              </SecondaryButton>
            )}

            {eitherStatus(AdStatus.Reviewing, AdStatus.Rejected) && (
              <NextLink href={viewVotingHref(contract)}>
                <SecondaryButton>{t('View voting')}</SecondaryButton>
              </NextLink>
            )}
          </Stack>
        </Flex>

        <HStack
          align="flex-start"
          spacing={4}
          bg="gray.50"
          px="4"
          py="3"
          mt="5"
          rounded="md"
        >
          <HStack flex={1} alignSelf="center">
            <InlineAdStatGroup spacing="1.5" labelWidth="16" flex={1}>
              <InlineAdStat label={t('Language')} value={language} />
              <InlineAdStat label={t('Min stake')} value={stake} />
            </InlineAdStatGroup>
            <InlineAdStatGroup spacing="1.5" labelWidth="14" flex={1}>
              <InlineAdStat label={t('Min age')} value={age} />
              <InlineAdStat label={t('OS')} value={os} />
            </InlineAdStatGroup>
          </HStack>

          <VDivider minH={68} h="full" />

          <Stack flex={1} justify="center">
            <InlineAdStatGroup spacing="2" labelWidth="20" flex={1}>
              <SmallInlineAdStat
                label={t('Burnt, {{time}}', {
                  time: new Intl.RelativeTimeFormat(i18n.language, {
                    style: 'short',
                  }).format(24, 'hour'),
                })}
                value={burnAmount ? formatDna(burnAmount.amount) : '--'}
                flex={0}
              />
              <SmallInlineAdStat
                label="Competitors"
                value={
                  status === AdStatus.Published ? String(competitorCount) : '--'
                }
                flex={0}
              />
              <SmallInlineAdStat
                label="Max price"
                value={
                  status === AdStatus.Published && maxCompetitor
                    ? formatDna(maxCompetitor.amount)
                    : '--'
                }
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

        <LinkBox>
          <LinkOverlay href={url} isExternal>
            <AdImage src={media} w={320} />
          </LinkOverlay>
        </LinkBox>
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
        <SuccessAlert
          icon={<InfoIcon color="green.500" boxSize={5} mr={3} />}
          fontSize="md"
        >
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

  const [fieldErrors, setFieldErrors] = React.useState({})

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
      onSubmit={async e => {
        e.preventDefault()

        const formAd = Object.fromEntries(new FormData(e.target).entries())

        const maybePersistedAd = ad ? await db.table('ads').get(ad.id) : null

        const nextAd = {
          ...formAd,
          thumb: isValidImage(formAd.thumb)
            ? formAd.thumb
            : maybePersistedAd?.thumb,
          media: isValidImage(formAd.media)
            ? formAd.media
            : maybePersistedAd?.media,
        }

        const errors = validateAd(nextAd)

        if (Object.values(errors).some(Boolean)) {
          setFieldErrors(errors)
        } else {
          onSubmit(nextAd)
        }
      }}
      {...props}
    >
      <Stack spacing={6} w="mdx">
        <FormSection>
          <FormSectionTitle>{t('Content')}</FormSectionTitle>
          <Stack spacing={3}>
            <AdFormField label={t('Title')} maybeError={fieldErrors.title}>
              <InputGroup>
                <Input name="title" defaultValue={ad?.title} maxLength={40} />
                <InputCharacterCount>{titleCharacterCount}</InputCharacterCount>
              </InputGroup>
            </AdFormField>
            <AdFormField label={t('Description')} maybeError={fieldErrors.desc}>
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
            <AdFormField label="Link" maybeError={fieldErrors.url}>
              <Input type="url" name="url" defaultValue={ad?.url} />
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
                maybeError={fieldErrors.media}
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
                maybeError={fieldErrors.thumb}
                onChange={setThumb}
              />
            </Box>
          </HStack>
        </FormSection>
        <FormSection>
          <FormSectionTitle>{t('Target audience')}</FormSectionTitle>
          <Stack spacing={3} shouldWrapChildren>
            <AdFormField label={t('Language')}>
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
            <AdFormField label={t('Min age')}>
              <AdNumberInput
                name="age"
                defaultValue={ad?.age}
                min={0}
                max={Number.MAX_SAFE_INTEGER}
              />
              <FormHelperText color="muted" fontSize="sm" mt="1">
                {t('Min age to see the ad')}
              </FormHelperText>
            </AdFormField>
            <AdFormField label={t('Min stake')}>
              <AdNumberInput
                name="stake"
                defaultValue={ad?.stake}
                min={0}
                max={Number.MAX_SAFE_INTEGER}
                addon={t('iDNA')}
              />
              <FormHelperText color="muted" fontSize="sm" mt="1">
                {t('Min stake amount to see the ad')}
              </FormHelperText>
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
  name,
  value,
  label,
  description,
  fallbackSrc,
  maybeError,
  onChange,
  ...props
}) {
  const src = React.useMemo(
    () =>
      isValidImage(value) ? URL.createObjectURL(value) : value ?? adFallbackSrc,
    [value]
  )

  return (
    <FormControl isInvalid={Boolean(maybeError)}>
      <FormLabel htmlFor={name} m={0} p={0}>
        <VisuallyHiddenInput
          id={name}
          name={name}
          type="file"
          accept="image/png,image/jpg,image/jpeg"
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
        <HStack spacing={4} align="center" cursor="pointer">
          <Box flexShrink={0}>
            {src !== adFallbackSrc ? (
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
        <AdFormError>{maybeError}</AdFormError>
      </FormLabel>
    </FormControl>
  )
}

export function ReviewAdDrawer({
  ad,
  onDeployContract,
  onStartVoting,
  ...props
}) {
  const {t} = useTranslation()

  const coinbase = useCoinbase()

  const balance = useBalance(coinbase)

  const failToast = useFailToast()

  const [isPending, {on: setIsPendingOn, off: setIsPendingOff}] = useBoolean()

  const {submit} = useReviewAd({
    onBeforeSubmit: setIsPendingOn,
    onDeployContract,
    onStartVoting: React.useCallback(
      data => {
        onStartVoting(data)
        setIsPendingOff()
      },
      [onStartVoting, setIsPendingOff]
    ),
    onError: React.useCallback(
      error => {
        failToast(error)
        setIsPendingOff()
      },
      [failToast, setIsPendingOff]
    ),
  })

  const {data: deployAmount} = useDeployVotingAmount()

  const {data: startAmount} = useStartAdVotingAmount()

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
          </Stack>
          <Stack spacing={6} bg="gray.50" p={6} rounded="lg">
            <Stack isInline spacing={5}>
              <AdImage src={adImageThumbSrc(ad)} w="10" />
              <Box>
                <Text fontWeight={500}>{ad.title}</Text>
                <ExternalLink href={ad.url} maxW="48">
                  {ad.url}
                </ExternalLink>
              </Box>
            </Stack>
            <Stack spacing={3}>
              <HDivider />
              <InlineAdStatGroup labelWidth="20">
                <SmallInlineAdStat label={t('Language')} value={ad.language} />
                <SmallInlineAdStat label={t('Min stake')} value={ad.stake} />
                <SmallInlineAdStat label={t('Min age')} value={ad.age} />
                <SmallInlineAdStat label={t('OS')} value={ad.os} />
              </InlineAdStatGroup>
            </Stack>
          </Stack>
          <form
            id="reviewForm"
            onSubmit={async e => {
              e.preventDefault()

              const {thumb, media} = await db.table('ads').get(ad.id)

              const errors = validateAd({...ad, thumb, media})

              if (Object.values(errors).some(Boolean)) {
                failToast({
                  title: t('Unable to send invalid ad'),
                  description: t(`Please check {{fields}} fields`, {
                    fields: Object.entries(errors)
                      .filter(([, v]) => Boolean(v))
                      .map(([k]) => k)
                      .join(', '),
                  }),
                })
                return
              }

              if (deployAmount && startAmount) {
                const requiredAmount = deployAmount + startAmount

                if (balance > requiredAmount) {
                  try {
                    submit({
                      ...ad,
                      thumb: new Uint8Array(
                        await compressAdImage(await thumb.arrayBuffer(), {
                          width: 80,
                          height: 80,
                          type: thumb.type,
                        })
                      ),
                      media: new Uint8Array(
                        await compressAdImage(await media.arrayBuffer(), {
                          width: 320,
                          height: 320,
                          type: thumb.type,
                        })
                      ),
                    })
                  } catch (error) {
                    failToast({
                      title: t('Error compressing images'),
                      description: error?.message,
                    })
                  }
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

  const [isPending, {on: setIsPendingOn, off: setIsPendingOff}] = useBoolean()

  const {submit} = usePublishAd({
    onBeforeSubmit: setIsPendingOn,
    onMined: React.useCallback(() => {
      onPublish()
      setIsPendingOff()
    }, [onPublish, setIsPendingOff]),
    onError: React.useCallback(
      error => {
        failToast(error)
        setIsPendingOff()
      },
      [failToast, setIsPendingOff]
    ),
  })

  const {data: competingAds} = useCompetingAds(ad.cid, new AdTarget(ad))

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
            {t('Create ad campaign')}
          </Heading>
        </Stack>
      </DrawerHeader>
      <DrawerBody overflowY="auto" mx={-6} mb={10}>
        <Stack spacing="6" color="brandGray.500" fontSize="md" p={6} pt={0}>
          <Stack spacing="3">
            <Text>
              {t(
                'Your ad campaign is about to be created for the audience with the following target parameters:',
                {nsSeparator: '|'}
              )}
            </Text>
          </Stack>

          <Stack spacing="6" bg="gray.50" p={6} rounded="lg">
            <Stack isInline spacing={5}>
              <AdImage src={adImageThumbSrc(ad)} w="10" />
              <Box>
                <Text fontWeight={500}>{ad.title}</Text>
                <ExternalLink href={ad.url} maxW="48">
                  {ad.url}
                </ExternalLink>
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
                <SmallInlineAdStat label={t('Min stake')} value={ad.stake} />
                <SmallInlineAdStat label={t('Min age')} value={ad.age} />
                <SmallInlineAdStat label={t('OS')} value={ad.os} />
              </InlineAdStatGroup>
            </Stack>
          </Stack>
        </Stack>
      </DrawerBody>
      <DrawerFooter>
        <PrimaryButton
          isLoading={isPending}
          loadingText={t('Creating...')}
          onClick={() => {
            if (balance > 0) {
              submit(ad)
            } else {
              failToast(t('Insufficient funds to start campaign'))
            }
          }}
        >
          {t('Create')}
        </PrimaryButton>
      </DrawerFooter>
    </AdDrawer>
  )
}

export function BurnDrawer({ad, onBurn, ...props}) {
  const {t} = useTranslation()

  const [{address}] = useIdentity()

  const balance = useBalance(address)

  const failToast = useFailToast()

  const [isPending, {on: setIsPendingOn, off: setIsPendingOff}] = useBoolean()

  const {submit} = useBurnAd({
    onMined: React.useCallback(() => {
      onBurn()
      setIsPendingOff()
    }, [onBurn, setIsPendingOff]),
    onError: React.useCallback(
      error => {
        failToast(error)
        setIsPendingOff()
      },
      [failToast, setIsPendingOff]
    ),
  })

  const formatDna = useFormatDna()

  const {data: competingAds} = useCompetingAds(ad.cid, new AdTarget(ad))

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
          </Stack>

          <Stack spacing="6" bg="gray.50" p={6} rounded="lg">
            <Stack isInline spacing={5}>
              <AdImage src={adImageThumbSrc(ad)} w="10" />
              <Box>
                <Text fontWeight={500}>{ad.title}</Text>
                <ExternalLink href={ad.url} maxW="48">
                  {ad.url}
                </ExternalLink>
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
                <SmallInlineAdStat label={t('Min stake')} value={ad.stake} />
                <SmallInlineAdStat label={t('Min age')} value={ad.age} />
                <SmallInlineAdStat label={t('OS')} value={ad.os} />
              </InlineAdStatGroup>
            </Stack>
          </Stack>
          <form
            id="burnForm"
            onSubmit={e => {
              e.preventDefault()

              const amount = Number(new FormData(e.target).get('amount'))

              if (amount > 0 && amount < balance) {
                setIsPendingOn()
                submit({ad, amount})
              } else {
                failToast(
                  amount > 0
                    ? t('Insufficient funds to burn {{amount}}', {
                        amount: formatDna(amount),
                      })
                    : t('Invalid amount')
                )
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
      {label && <AdStatLabel lineHeight="4">{label}</AdStatLabel>}
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
    <Stat flex={0} lineHeight="4" {...props}>
      <HStack>
        {label && <AdStatLabel width={labelWidth}>{label}</AdStatLabel>}
        {children || <AdStatNumber>{value || 'Any'}</AdStatNumber>}
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
      <AdStatNumber fontSize="sm">{value || 'Any'}</AdStatNumber>
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

export function AdDebug() {
  const {decodeProfile, decodeAd} = useProtoProfileDecoder()

  const [result, setResult] = React.useState()

  return (
    <Stack spacing="6">
      <Stack as="section" spacing="4">
        <form
          onSubmit={e => {
            e.preventDefault()

            const formData = new FormData(e.target)
            const decodedProfile = decodeProfile(formData.get('encodedProfile'))

            setResult(decodedProfile)
          }}
        >
          <fieldset>
            <legend>Profile decoder</legend>
            <FormLabel>
              Encoded profile
              <Input name="encodedProfile" />
            </FormLabel>
          </fieldset>
          <PrimaryButton type="submit">Decode profile</PrimaryButton>
        </form>
        <form
          onSubmit={e => {
            e.preventDefault()

            const formData = new FormData(e.target)
            const decodedProfile = decodeAd(formData.get('encodedAd'))

            setResult(decodedProfile)
          }}
        >
          <fieldset>
            <legend>Ad decoder</legend>
            <FormLabel>
              Encoded ad
              <Input name="encodedAd" />
            </FormLabel>
          </fieldset>
          <PrimaryButton type="submit">Decode ad</PrimaryButton>
        </form>
      </Stack>
      <Debug>{result ?? null}</Debug>
    </Stack>
  )
}

export function AdOfferListItem({
  burn: {cid, target, address, amount},
  onBurn,
}) {
  const {t} = useTranslation()

  const {decodeAd, decodeAdTarget} = useProtoProfileDecoder()

  const {data: ad, isLoading, isError} = useIpfsAd(cid, {
    select: data => ({
      ...decodeAd(data),
      ...decodeAdTarget(target),
      cid,
      author: address,
    }),
  })

  const formatDna = useFormatDna()

  const targetValues = React.useMemo(
    () => Object.values(pick(ad ?? {}, ['language', 'os', 'age', 'stake'])),
    [ad]
  )

  const coinbase = useCoinbase()

  const isSelfAuthor = ad?.author === coinbase

  if (isLoading || isError) {
    return (
      <Tr fontWeight={500}>
        <Td colSpan={4} px={0}>
          <Skeleton h="10" />
        </Td>
      </Tr>
    )
  }

  return (
    <Tr fontWeight={500}>
      <Td>
        <HStack>
          <AdImage src={adImageThumbSrc(ad)} boxSize="10" />
          <Stack spacing="1.5">
            <Text lineHeight={4} isTruncated>
              {ad.title}
            </Text>
            <HStack spacing={1}>
              <Avatar
                address={ad.author}
                boxSize="4"
                borderWidth={1}
                borderColor="brandGray.016"
                borderRadius={['mobile', 'sm']}
              />
              <Text
                color="muted"
                fontSize="sm"
                fontWeight={500}
                lineHeight="shorter"
              >
                {ad.author}
              </Text>
            </HStack>
          </Stack>
        </HStack>
      </Td>
      <Td>
        <NextLink href={String(ad.url)} passHref>
          <Link target="_blank" color="blue.500">
            {ad.url}
          </Link>
        </NextLink>
      </Td>
      <Td>
        {targetValues.some(Boolean) ? (
          <>
            {t('Set')}{' '}
            <Tooltip
              label={
                <InlineAdStatGroup labelWidth="16">
                  <SmallInlineAdStat
                    label={t('Language')}
                    value={ad.language || 'Any'}
                  />
                  <SmallInlineAdStat label={t('OS')} value={ad.os || 'Any'} />
                  <SmallInlineAdStat label={t('Age')} value={ad.age ?? 'Any'} />
                  <SmallInlineAdStat
                    label={t('Stake')}
                    value={ad.stake ?? 'Any'}
                  />
                </InlineAdStatGroup>
              }
              placement="right-start"
              arrowSize={8}
              offset={[-8, 6]}
            >
              <Button
                variant="link"
                rightIcon={<ChevronRightIcon />}
                iconSpacing="0"
                color="blue.500"
                cursor="pointer"
                _hover={{
                  textDecoration: 'none',
                }}
              >
                {t('{{count}} targets', {
                  count: targetValues.filter(Boolean).length,
                })}
              </Button>
            </Tooltip>
          </>
        ) : (
          t('Not set')
        )}
      </Td>
      <Td>
        <HStack spacing="5">
          <Text as="span">{formatDna(amount)}</Text>
          {isSelfAuthor ? (
            <SecondaryButton
              onClick={() => {
                onBurn(ad)
              }}
            >
              {t('Burn')}
            </SecondaryButton>
          ) : (
            <Box w={61} h="8" />
          )}
        </HStack>
      </Td>
    </Tr>
  )
}
