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
  Icon,
  Image,
  Select,
  Stack,
  Stat,
  Text,
  Textarea,
  VisuallyHidden,
  HStack,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useMachine} from '@xstate/react'
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
  MenuIconItem,
  Input,
  Menu,
  SuccessAlert,
  DrawerPromotionPortal,
} from '../../shared/components/components'
import {
  callRpc,
  // countryCodes,
  toLocaleDna,
} from '../../shared/utils/utils'
// import {DnaInput, FillCenter} from '../oracles/components'
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
import {adFormMachine, useAdStatusColor} from './hooks'
import {hasImageType} from '../../shared/utils/img'
import {AVAILABLE_LANGS} from '../../i18n'
import {buildTargetKey, createAdDb, hexToObject, isEligibleAd} from './utils'
import {useEpoch} from '../../shared/providers/epoch-context'
import {useIdentity} from '../../shared/providers/identity-context'
import {OracleIcon, PhotoIcon, UploadIcon} from '../../shared/components/icons'

export function BlockAdStat({label, value, children, ...props}) {
  return (
    <Stat flex="initial" {...props}>
      {label && <AdStatLabel>{label}</AdStatLabel>}
      {value && <AdStatNumber>{value}</AdStatNumber>}
      {children}
    </Stat>
  )
}

export function InlineAdGroup({labelWidth, children, ...props}) {
  return (
    <Stack {...props}>
      {React.Children.map(children, c => React.cloneElement(c, {labelWidth}))}
    </Stack>
  )
}

export function InlineAdStat({
  label,
  value,
  labelWidth,
  fontSize = 'md',
  children,
  ...props
}) {
  return (
    <Stack as={BlockAdStat} isInline {...props}>
      {label && (
        <AdStatLabel fontSize={fontSize} flexBasis={labelWidth}>
          {label}
        </AdStatLabel>
      )}
      {value && <AdStatNumber fontSize={fontSize}>{value}</AdStatNumber>}
      {children}
    </Stack>
  )
}

export function SmallInlineAdStat(props) {
  return <InlineAdStat fontSize="sm" {...props} />
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

export function AdBanner({limit = 5, ...props}) {
  const {i18n} = useTranslation()

  const epoch = useEpoch()
  const [{address, age, stake}] = useIdentity()

  const [showingAd, setShowingAd] = React.useState()

  React.useEffect(() => {
    if (epoch?.epoch) {
      const targetKey = buildTargetKey({
        locale: i18n.language,
        age,
        stake,
      })

      callRpc('bcn_burntCoins').then(result => {
        if (result) {
          const targetedAds = result.filter(({key}) =>
            isEligibleAd(targetKey, key)
          )

          // eslint-disable-next-line no-shadow
          targetedAds.slice(0, limit).forEach(async ({address}) => {
            const res = await callRpc('dna_profile', address)
            const {ads} = hexToObject(res.info ?? {})
            if (ads?.length > 0) {
              const [ad] = ads
              setShowingAd({
                ...ad,
                ...(await createAdDb(epoch?.epoch).get(ad.id)),
              })
            }
          })
        }
      })
    }
  }, [age, epoch, i18n.language, limit, stake])

  const {
    title = 'Your tagline here',
    cover,
    issuer = address,
    url = 'https://idena.io',
  } = showingAd ?? {}

  return (
    <Flex
      align="center"
      justify="space-between"
      borderBottomWidth={1}
      borderBottomColor="gray.300"
      px={4}
      py={2}
      position="sticky"
      top={0}
      zIndex="banner"
      {...props}
    >
      <Stack
        isInline
        cursor="pointer"
        onClick={() => {
          global.openExternal(url)
        }}
      >
        <AdCoverImage ad={{cover}} w="10" />
        <Stack spacing={1}>
          <Text color>{title}</Text>
          <Stack isInline spacing={1}>
            <Avatar
              address={issuer}
              size={14}
              borderWidth={1}
              borderColor="gray.016"
              rounded="sm"
            />
            <Text
              color="muted"
              fontSize="sm"
              fontWeight={500}
              lineHeight="base"
            >
              {issuer}
            </Text>
          </Stack>
        </Stack>
      </Stack>
      <Box>
        <Menu>
          <MenuIconItem icon="ads">My Ads</MenuIconItem>
          <MenuIconItem icon="cards">View all offers</MenuIconItem>
        </Menu>
      </Box>
    </Flex>
  )
}

export function AdStatusText({children, status = children}) {
  const color = useAdStatusColor(status)

  return (
    <Text
      color={color}
      fontWeight={500}
      textTransform="capitalize"
      wordBreak="break-all"
    >
      {status}
    </Text>
  )
}

export function AdCoverImage({ad: {cover}, w, width = w, ...props}) {
  const src = React.useMemo(() => URL.createObjectURL(new Blob([cover])), [
    cover,
  ])

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
              value={location}
              onChange={e => send('CHANGE', {ad: {location: e.target.value}})}
            >
              <option></option>
              {Object.values(['USA', 'CA']).map(c => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </AdFormField>
          <AdFormField label="Language" id="lang">
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
              defaulValue={age}
              onBlur={({target: {value}}) => send('CHANGE', {ad: {age: value}})}
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
              <option>{t('macOS')}</option>
              <option>{t('Windows')}</option>
              <option>{t('Linux')}</option>
            </Select>
          </AdFormField>
        </Stack>
      </FormSection>
    </Stack>
  )
}

export function PublishAdDrawer({ad, ...props}) {
  const {i18n} = useTranslation()

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
            <Icon name="ads" size={6} color="brandBlue.500" />
          </FillCenter>
          <Heading fontSize="lg" fontWeight={500}>
            Pay
          </Heading>
        </Stack>
      </DrawerHeader>
      <DrawerBody overflowY="auto" mx={-6}>
        <Stack spacing={6} color="brandGray.500" fontSize="md" p={6} pt={0}>
          <Text>
            In order to make your ads visible for Idena users you need to burn
            more coins than competitors targeting the same audience.
          </Text>
          <Stack spacing={6} bg="gray.50" p={6} rounded="lg">
            <Stack isInline spacing={5}>
              <AdCoverImage ad={ad} w="10" />
              <Text fontWeight={500}>{ad.title}</Text>
            </Stack>
            <Stack spacing={3}>
              <HDivider />
              <Stack>
                <InlineAdStat label="Competitors" value={10} />
                <InlineAdStat
                  label="Max price"
                  value={toLocaleDna(i18n.language)(0.22)}
                />
              </Stack>
              <HDivider />
              <Stack>
                <SmallInlineAdStat label="Location" value={ad.location} />
                <SmallInlineAdStat label="Language" value={ad.lang} />
                <SmallInlineAdStat label="Stake" value={ad.stake} />
                <SmallInlineAdStat label="Age" value={ad.age} />
                <SmallInlineAdStat label="OS" value={ad.os} />
              </Stack>
            </Stack>
          </Stack>
          <FormControl>
            <FormLabel htmlFor="amount">Amount, DNA</FormLabel>
            <Input id="amount" />
          </FormControl>
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
        <PrimaryButton>Burn</PrimaryButton>
      </DrawerFooter>
    </Drawer>
  )
}

export function ReviewAdDrawer({ad, isMining, onCancel, onSubmit, ...props}) {
  const {t} = useTranslation()

  return (
    <AdDrawer isMining={isMining} ad={ad} onClose={onCancel} {...props}>
      <DrawerHeader>
        <Stack spacing={4}>
          <FillCenter
            alignSelf="flex-start"
            bg="blue.012"
            w={12}
            minH={12}
            rounded="xl"
          >
            <OracleIcon boxSize={6} color="blue.500" />
          </FillCenter>
          <Heading color="brandGray.500" fontSize="lg" fontWeight={500}>
            {t('Send to Oracle Voting')}
          </Heading>
        </Stack>
      </DrawerHeader>
      <DrawerBody overflowY="auto" mx={-6}>
        <Stack spacing={6} color="brandGray.500" fontSize="md" p={6} pt={0}>
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
                variantColor="orange"
                bg="orange.020"
                color="orange.500"
                fontWeight="normal"
                rounded="xl"
                h={8}
                px={3}
                textTransform="initial"
                {...props}
              >
                {t('Mining...')}
              </Badge>
            )}
          </Stack>
          <FormControl>
            <Stack>
              <FormLabel htmlFor="amount">Review fee, DNA</FormLabel>
              <Input id="amount" />
            </Stack>
          </FormControl>
        </Stack>
      </DrawerBody>
      <DrawerFooter
        spacing={2}
        borderTopWidth={1}
        borderTopColor="gray.100"
        py={3}
        px={4}
        position="absolute"
        left={0}
        right={0}
        bottom={0}
      >
        <Stack isInline>
          <SecondaryButton onClick={onCancel}>{t('Not now')}</SecondaryButton>
          <PrimaryButton
            isLoading={isMining}
            loadingText={t('Mining...')}
            onClick={onSubmit}
          >
            {t('Send')}
          </PrimaryButton>
        </Stack>
      </DrawerFooter>
    </AdDrawer>
  )
}

export function AdDrawer({isMining = true, ad = {}, children, ...props}) {
  return (
    <Drawer {...props}>
      {children}
      {isMining && (
        <DrawerPromotionPortal>
          <AdPromotion {...ad} />
        </DrawerPromotionPortal>
      )}
    </Drawer>
  )
}

function AdPromotion({title, url, author, cover, totalBurnt}) {
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
          <Flex justify="space-between">
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
          </Flex>
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
