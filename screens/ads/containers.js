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
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useMachine} from '@xstate/react'
import {useRouter} from 'next/router'
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
  adFormMachine,
  useAdRotation,
  useAdStatusColor,
  useAdStatusText,
} from './hooks'
import {hasImageType} from '../../shared/utils/img'
import {AVAILABLE_LANGS} from '../../i18n'
import {
  AdsIcon,
  OracleIcon,
  PhotoIcon,
  PicIcon,
  UploadIcon,
} from '../../shared/components/icons'
import {countryCodes, OS} from './utils'
import {getRandomInt} from '../flips/utils'

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

export function AdBanner({limit = 5}) {
  const {t} = useTranslation()

  const router = useRouter()

  const {ads, status} = useAdRotation(limit)

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

function AdBannerActiveAd({
  title = 'Your ad may be here',
  url = 'https://idena.io',
  cover,
  author = `0x${'0'.repeat(40)}`,
  isLoaded,
}) {
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

export function AdCoverImage({ad: {cover}, w, width = w, ...props}) {
  const src = React.useMemo(
    () => cover && URL.createObjectURL(new Blob([cover], {type: 'image/jpeg'})),
    [cover]
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

export function AdForm({onChange, ...ad}) {
  const {t} = useTranslation()

  const [current, send] = useMachine(adFormMachine, {
    context: {
      ...ad,
    },
    actions: {
      change: context => onChange(context),
    },
  })

  const {
    title,
    cover,
    url,
    location,
    language,
    age,
    os,
    stake,
  } = current.context

  return (
    <Stack spacing={6} w="lg">
      <FormSection>
        <FormSectionTitle>{t('Parameters')}</FormSectionTitle>
        <Stack isInline spacing={10}>
          <Stack spacing={4} shouldWrapChildren>
            <AdFormField label="Text" id="text" align="flex-start">
              <Textarea
                defaultValue={title}
                onBlur={e => send('CHANGE', {ad: {title: e.target.value}})}
              />
            </AdFormField>
            <AdFormField label="Link" id="link">
              <AdInput
                defaultValue={url}
                onBlur={e => send('CHANGE', {ad: {url: e.target.value}})}
              />
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
                onClick={() => document.querySelector('#cover').click()}
              >
                <PhotoIcon boxSize={10} color="muted" />
              </FillCenter>
            )}
            <VisuallyHidden>
              <Input
                id="cover"
                type="file"
                accept="image/*"
                opacity={0}
                onChange={async e => {
                  const {files} = e.target
                  if (files.length) {
                    const [file] = files
                    if (hasImageType(file)) {
                      send('CHANGE', {
                        ad: {cover: file},
                      })
                    }
                  }
                }}
              />
            </VisuallyHidden>
            <IconButton
              as={FormLabel}
              htmlFor="cover"
              type="file"
              icon={<UploadIcon boxSize={4} />}
            >
              {t('Upload cover')}
            </IconButton>
          </Stack>
        </Stack>
      </FormSection>
      <FormSection>
        <FormSectionTitle>{t('Targeting conditions')}</FormSectionTitle>
        <Stack spacing={4} shouldWrapChildren>
          <AdFormField label="Location" id="location">
            <Select
              isDisabled
              value={location}
              onChange={e => send('CHANGE', {ad: {location: e.target.value}})}
            >
              <option></option>
              {countryCodes.map(c => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </AdFormField>
          <AdFormField label="Language" id="language">
            <Select
              value={language}
              onChange={e => send('CHANGE', {ad: {language: e.target.value}})}
            >
              <option></option>
              {AVAILABLE_LANGS.map(l => (
                <option key={l}>{l}</option>
              ))}
            </Select>
          </AdFormField>
          <AdFormField label="Age" id="age">
            <AdNumberInput
              value={age}
              onChange={value => send('CHANGE', {ad: {age: value}})}
            />
          </AdFormField>
          <AdFormField label="Stake" id="stake">
            <Input
              defaultValue={stake}
              onChange={({target: {value}}) =>
                send('CHANGE', {ad: {stake: value}})
              }
            />
          </AdFormField>
          <AdFormField label="OS" id="os">
            <Select
              value={os}
              onChange={e => send('CHANGE', {ad: {os: e.target.value}})}
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
  const {ads, status} = useAdRotation()

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
