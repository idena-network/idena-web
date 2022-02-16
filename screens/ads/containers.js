/* eslint-disable react/prop-types */
import * as React from 'react'
import {
  AspectRatio,
  Badge,
  Box,
  Button,
  DrawerFooter,
  Flex,
  FormControl,
  Heading,
  Image,
  Select,
  Stack,
  Stat,
  Text,
  Textarea,
  VisuallyHidden,
  HStack,
  Center,
  MenuItem,
  LinkBox,
  LinkOverlay,
  MenuDivider,
  useDisclosure,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'next/router'
import NextLink from 'next/link'
import {
  IconButton,
  PrimaryButton,
  SecondaryButton,
} from '../../shared/components/button'
import {
  Avatar,
  Drawer,
  DrawerBody,
  DrawerHeader,
  ExternalLink,
  FillCenter,
  FormLabel,
  HDivider,
  Input,
  SuccessAlert,
  DrawerPromotionPortal,
  Menu,
  Skeleton,
  TextLink,
  VDivider,
} from '../../shared/components/components'
import {toLocaleDna} from '../../shared/utils/utils'
import {
  AdFormField,
  AdInput,
  AdNumberInput,
  AdStatLabel,
  AdStatNumber,
  FormSection,
  FormSectionTitle,
} from './components'
import {Fill} from '../../shared/components'
import {
  useAdAction,
  useAdRotation2,
  useAdStatusColor,
  useAdStatusText,
} from './hooks'
import {hasImageType} from '../../shared/utils/img'
import {AVAILABLE_LANGS} from '../../i18n'
import {
  AdsIcon,
  DeleteIcon,
  EditIcon,
  OracleIcon,
  PhotoIcon,
  PicIcon,
  UploadIcon,
} from '../../shared/components/icons'
import {isApprovedAd, isReviewingAd, OS} from './utils'
import {getRandomInt} from '../flips/utils'
import {AdStatus, AdVotingOptionId} from './types'
import {useAuthState} from '../../shared/providers/auth-context'
import {useFailToast, useSuccessToast} from '../../shared/hooks/use-toast'
import {viewVotingHref} from '../oracles/utils'

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
      rounded="lg"
      backgroundImage={`linear-gradient(to top, ${startColor}, transparent)`}
    />
  )
}

export function AdBanner() {
  const {t} = useTranslation()

  const router = useRouter()

  const {ads, status} = useAdRotation2()

  const ad = ads[getRandomInt(0, ads.length)]

  return (
    <Flex
      align="center"
      justify="space-between"
      borderBottomWidth={1}
      borderBottomColor="gray.100"
      px={4}
      py={2}
    >
      <AdBannerActiveAd isLoaded={status === 'done'} {...ad} />
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

function AdBannerActiveAd({title, url, cover, author, isLoaded}) {
  return (
    <LinkBox as={HStack} spacing={2}>
      <Skeleton isLoaded={isLoaded}>
        <AdCoverImage ad={{cover}} w={10} />
      </Skeleton>
      <Stack spacing={1}>
        <LinkOverlay href={url} target="_blank">
          <Skeleton isLoaded={isLoaded}>
            <Text lineHeight="none">{title}</Text>
          </Skeleton>
        </LinkOverlay>
        <Skeleton isLoaded={isLoaded}>
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
        </Skeleton>
      </Stack>
    </LinkBox>
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

export function AdCoverImage({ad: {cover, coverUrl}, w, width = w, ...props}) {
  const src = React.useMemo(
    () =>
      coverUrl ||
      (cover && URL.createObjectURL(new Blob([cover], {type: 'image/jpeg'}))),
    [cover, coverUrl]
  )

  return (
    <AspectRatio ratio={1} w={width}>
      <Image
        src={src}
        fallbackSrc="/static/body-medium-pic-icn.svg"
        bg="gray.50"
        rounded="lg"
        {...props}
      />
    </AspectRatio>
  )
}

// FIXME: https://github.com/chakra-ui/chakra-ui/issues/5285
export function PlainAdCoverImage({w, width = w, boxSize, ...props}) {
  return (
    <AspectRatio ratio={1} width={width} boxSize={boxSize}>
      <Image ignoreFallback bg="gray.50" rounded="lg" {...props} />
    </AspectRatio>
  )
}

export function AdForm({ad, onSubmit, ...props}) {
  const {t} = useTranslation()

  const [cover, setCover] = React.useState(ad?.cover)

  const coverRef = React.useRef()

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
      <Stack spacing={6} w="lg">
        <FormSection>
          <FormSectionTitle>{t('Parameters')}</FormSectionTitle>
          <Stack isInline spacing={10}>
            <Stack spacing={4} shouldWrapChildren>
              <AdFormField label="Title" align="flex-start">
                <Textarea name="title" defaultValue={ad?.title} />
              </AdFormField>
              <AdFormField label="Link">
                <AdInput name="url" defaultValue={ad?.url} />
              </AdFormField>
            </Stack>
            <Stack spacing={4} alignItems="flex-start">
              {cover ? (
                <AdCoverImage ad={{cover}} w="20" />
              ) : (
                <FillCenter
                  bg="gray.50"
                  borderWidth="1px"
                  borderColor="gray.100"
                  h={20}
                  w={20}
                  rounded="lg"
                  onClick={() => {
                    coverRef.current.click()
                  }}
                >
                  <PhotoIcon boxSize={10} color="muted" />
                </FillCenter>
              )}
              <VisuallyHidden>
                <Input
                  ref={coverRef}
                  name="cover"
                  type="file"
                  accept="image/*"
                  opacity={0}
                  onChange={async e => {
                    const {files} = e.target
                    if (files.length) {
                      const [file] = files
                      if (hasImageType(file)) {
                        setCover(file)
                      }
                    }
                  }}
                />
              </VisuallyHidden>
              <IconButton
                icon={<UploadIcon boxSize={4} />}
                onClick={() => {
                  coverRef.current.click()
                }}
              >
                {t('Upload cover')}
              </IconButton>
            </Stack>
          </Stack>
        </FormSection>
        <FormSection>
          <FormSectionTitle>{t('Targeting conditions')}</FormSectionTitle>
          <Stack spacing={4} shouldWrapChildren>
            <AdFormField label="Language">
              <Select name="language" defaultValue={ad?.language}>
                <option></option>
                {AVAILABLE_LANGS.map(lang => (
                  <option key={lang}>{lang}</option>
                ))}
              </Select>
            </AdFormField>
            <AdFormField label="Age">
              <AdNumberInput name="age" defaultValue={ad?.age} />
            </AdFormField>
            <AdFormField label="Stake">
              <Input name="stake" defaultValue={ad?.stake} />
            </AdFormField>
            <AdFormField label="OS">
              <Select name="os" defaultValue={ad?.os}>
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
}

export function ReviewAdDrawer({ad, isMining, onCancel, onSubmit, ...props}) {
  const {t} = useTranslation()

  return (
    <AdDrawer isMining={isMining} onClose={onCancel} {...props}>
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
            id="amountForm"
            onSubmit={e => {
              e.preventDefault()
              onSubmit(Number(e.target.elements.amount.value))
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
          <SecondaryButton onClick={onCancel}>{t('Not now')}</SecondaryButton>
          <PrimaryButton
            type="submit"
            form="amountForm"
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

export function PublishAdDrawer({ad, isMining, onSubmit, onCancel, ...props}) {
  const {t, i18n} = useTranslation()

  return (
    <AdDrawer isMining={isMining} onClose={onCancel} {...props}>
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
                <InlineAdStat
                  label="Max price"
                  value={toLocaleDna(i18n.language)(0)}
                />
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
          onClick={onSubmit}
        >
          {t('Publish')}
        </PrimaryButton>
      </DrawerFooter>
    </AdDrawer>
  )
}

export function BurnDrawer({ad, onSubmit, ...props}) {
  const {t, i18n} = useTranslation()

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
                <InlineAdStat
                  label="Max price"
                  value={toLocaleDna(i18n.language)(0)}
                />
              </Stack>
              {/* <HDivider />
              <Stack>
                <SmallInlineAdStat label="Language" value={ad.language} />
                <SmallInlineAdStat label="Stake" value={ad.stake} />
                <SmallInlineAdStat label="Age" value={ad.age} />
                <SmallInlineAdStat label="OS" value={ad.os} />
              </Stack> */}
            </Stack>
          </Stack>
          <form
            id="burnForm"
            onSubmit={e => {
              e.preventDefault()
              onSubmit(Number(e.target.elements.amount.value))
            }}
          >
            <FormControl>
              <Stack spacing={3}>
                <FormLabel htmlFor="amount" mb={0}>
                  {t('Amount, iDNA')}
                </FormLabel>
                <Input id="amount" />
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

export function AdDrawer({isMining = true, children, ...props}) {
  const {ads, status} = {ads: [], status: 'done'} // useAdRotation2()

  return (
    <Drawer {...props}>
      {children}
      {isMining && status === 'done' && (
        <DrawerPromotionPortal>
          <AdPromotion {...ads[getRandomInt(0, ads.length)]} />
        </DrawerPromotionPortal>
      )}
    </Drawer>
  )
}

function AdPromotion({
  title = 'Your ad may be here',
  url = 'https://idena.io',
  cover,
  author = `0x${'0'.repeat(40)}`,
  totalBurnt = 0,
}) {
  const {t, i18n} = useTranslation()

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
          <AdCoverImage ad={{cover}} w={320} objectFit="cover" />
        </Stack>
        <Stack spacing={6}>
          <HStack justify="space-between" align="flex-start">
            <BlockAdStat
              label="Sponsored by"
              value={author}
              wordBreak="break-all"
              w="50%"
            />
            <BlockAdStat
              label="Burned for 24hrs"
              value={toLocaleDna(i18n.language)(totalBurnt)}
            />
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

const AdStatusFilterContext = React.createContext()

export function AdStatusFilterButtonList({
  value,
  onChange,
  children,
  ...props
}) {
  return (
    <HStack {...props}>
      <AdStatusFilterContext.Provider value={{value, onChange}}>
        {children}
      </AdStatusFilterContext.Provider>
    </HStack>
  )
}

export function AdStatusFilterButton({value, onClick, ...props}) {
  const {
    value: currentValue,
    onChange: onChangeCurrentValue,
  } = React.useContext(AdStatusFilterContext)

  return (
    <Button
      variant="tab"
      isActive={value === currentValue}
      onClick={e => {
        onChangeCurrentValue(value)
        if (onClick) onClick(e)
      }}
      {...props}
    />
  )
}

export function AdListItem({ad}) {
  const {t, i18n} = useTranslation()

  const router = useRouter()

  const toast = useSuccessToast()
  const failToast = useFailToast()

  const reviewDisclosure = useDisclosure()
  const publishDisclosure = useDisclosure()
  const burnDisclosure = useDisclosure()

  const {coinbase} = useAuthState()

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
    competitorCount,
    maxCompetitorPrice,
    coverUrl,
    result: votingResult,
  } = ad

  const {
    status: actionStatus,
    sendToReview,
    publish,
    burn,
    remove,
  } = useAdAction({
    ad,
  })

  const isMining = actionStatus === 'pending'

  return (
    <>
      <HStack key={id} spacing="5" align="flex-start">
        <Stack spacing={2} w="16" flexShrink={0}>
          <Box position="relative">
            <PlainAdCoverImage
              src={coverUrl}
              fallbackSrc={
                status === AdStatus.Draft
                  ? '/static/body-medium-pic-icn.svg'
                  : null
              }
              ignoreFallback={status !== AdStatus.Draft}
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
                      remove(id)
                    }}
                  >
                    {t('Delete')}
                  </MenuItem>
                </Menu>
              </Box>

              {isPublished && isApprovedAd({status}) && (
                <SecondaryButton onClick={burnDisclosure.onOpen}>
                  {t('Burn')}
                </SecondaryButton>
              )}

              {!isPublished && isApprovedAd({status}) && (
                <SecondaryButton onClick={publishDisclosure.onOpen}>
                  {t('Publish')}
                </SecondaryButton>
              )}

              {status === AdStatus.Draft && (
                <SecondaryButton onClick={reviewDisclosure.onOpen}>
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
              value={toLocaleDna(i18n.language)(maxCompetitorPrice)}
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

      {reviewDisclosure.isOpen && (
        <ReviewAdDrawer
          {...reviewDisclosure}
          isMining={isMining}
          onSubmit={amount => {
            sendToReview({ad: {...ad, amount}, from: coinbase})
          }}
        />
      )}

      {publishDisclosure.isOpen && (
        <PublishAdDrawer
          {...publishDisclosure}
          isMining={isMining}
          onSubmit={() => {
            publish({ad, from: coinbase})
          }}
        />
      )}

      {burnDisclosure.isOpen && (
        <BurnDrawer
          {...burnDisclosure}
          onSubmit={async amount => {
            burn(amount, {
              onSuccess: () => {
                toast('🔥🔥🔥')
                burnDisclosure.onClose()
              },
              onError: failToast,
            })
          }}
        />
      )}
    </>
  )
}
