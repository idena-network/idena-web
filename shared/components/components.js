/* eslint-disable react/prop-types */
import React, {useState} from 'react'
// eslint-disable-next-line import/no-extraneous-dependencies
import ReactDOM from 'react-dom'
import {
  Code,
  Drawer as ChakraDrawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader as ChakraDrawerHeader,
  DrawerBody as ChakraDrawerBody,
  DrawerFooter as ChakraDrawerFooter,
  Input as ChakraInput,
  FormLabel as ChakraFormLabel,
  Select as ChakraSelect,
  Skeleton as ChakraSkeleton,
  Avatar as ChakraAvatar,
  Tooltip as ChakraTooltip,
  Flex,
  Alert,
  AlertTitle,
  AlertDescription,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Stack,
  Box,
  Button,
  FormControl,
  Divider,
  Text,
  Link,
  keyframes,
  useBreakpointValue,
  Th,
  InputGroup,
  InputRightAddon,
  Badge as ChakraBadge,
  Menu as ChakraMenu,
  MenuButton,
  MenuList,
  Center,
  HStack,
  useToken,
  FormHelperText,
} from '@chakra-ui/react'
import {borderRadius} from 'polished'
import {FiEye, FiEyeOff} from 'react-icons/fi'
import NextLink from 'next/link'
import dynamic from 'next/dynamic'
import {useTranslation} from 'react-i18next'
import {rem} from '../theme'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GtranslateIcon,
  InfoIcon,
  MoreIcon,
} from './icons'
import {clampValue, openExternalUrl} from '../utils/utils'
import {Heading} from './typo'
import {FlatButton, IconButton} from './button'
import {ApiKeyStates, useSettingsState} from '../providers/settings-context'
import {useEpoch} from '../providers/epoch-context'
import {useIdentity} from '../providers/identity-context'
import {IdentityStatus} from '../types'

export function FloatDebug({children, ...props}) {
  return (
    <Box position="absolute" left={6} bottom={6} zIndex="popover" {...props}>
      <Debug>{children}</Debug>
    </Box>
  )
}

export function Debug({children}) {
  return (
    <Code whiteSpace="pre" borderRadius="md" p={2}>
      {JSON.stringify(children, null, 2)}
    </Code>
  )
}

export function Drawer({isCloseable = true, children, ...props}) {
  const maxWidth = useBreakpointValue(['auto', 360])
  const drawerSize = useBreakpointValue(['full', 'xs'])
  const closeButtonSize = useBreakpointValue(['lg', 'md'])

  const drawerPromotion = React.useState()

  return (
    <DrawerPromotionContext.Provider value={drawerPromotion}>
      <ChakraDrawer placement="right" {...props}>
        <DrawerOverlay bg="xblack.080" />
        <DrawerContent
          px={8}
          pt={[4, 12]}
          pb={4}
          size={drawerSize}
          maxW={maxWidth}
        >
          {isCloseable && (
            <DrawerCloseButton
              size={closeButtonSize}
              color={['brandBlue.100', 'initial']}
            />
          )}
          {children}
        </DrawerContent>
        <DrawerPromotion
          left={maxWidth > 0 ? `calc(50% - ${maxWidth / 2}px)` : '50%'}
        />
      </ChakraDrawer>
    </DrawerPromotionContext.Provider>
  )
}

const DrawerPromotionContext = React.createContext([])

export function DrawerPromotion(props) {
  const [, setDrawerPromotion] = React.useContext(DrawerPromotionContext)

  return (
    <Center
      ref={setDrawerPromotion}
      position="absolute"
      top="50%"
      left="50%"
      transform="translate(-50%,-50%)"
      zIndex="modal"
      {...props}
    />
  )
}

export function DrawerPromotionPortal({children}) {
  const [drawerPromotion] = React.useContext(DrawerPromotionContext)

  return drawerPromotion
    ? ReactDOM.createPortal(children, drawerPromotion)
    : null
}

export function DrawerHeader(props) {
  return <ChakraDrawerHeader p={0} mb={3} {...props} />
}

export function DrawerBody(props) {
  return <ChakraDrawerBody p={0} {...props} />
}

export function DrawerFooter(props) {
  return <ChakraDrawerFooter {...props} />
}

export function FormLabel(props) {
  return <ChakraFormLabel fontWeight={500} color="brandGray.500" {...props} />
}

export function FormControlWithLabel({
  label,
  labelFontSize = 'md',
  children,
  ...props
}) {
  return (
    <FormControl {...props}>
      <FormLabel fontSize={labelFontSize} color="brandGray.500" mb={2}>
        {label}
      </FormLabel>
      {children}
    </FormControl>
  )
}

export function Input(props) {
  return <ChakraInput {...props} />
}

export function Select(props) {
  const iconSize = useToken('space', '5')
  return (
    <ChakraSelect
      icon={<ChevronDownIcon />}
      iconColor="muted"
      iconSize={iconSize}
      borderColor="gray.100"
      fontSize="md"
      lineHeight="short"
      h={8}
      _placeholder={{
        color: 'muted',
      }}
      _disabled={{
        bg: 'gray.100',
        color: 'muted',
      }}
      {...props}
    />
  )
}

export function PasswordInput({width, ...props}) {
  const [show, setShow] = useState(false)

  return (
    <div
      style={{
        position: 'relative',
        width,
      }}
    >
      <Input
        type={show ? 'text' : 'password'}
        pr={[8, 3]}
        opacity={[0.8, 1]}
        {...props}
      />
      <Box
        mt={['5px', '-3px']}
        opacity={[0.16, 1]}
        style={{
          ...borderRadius('right', rem(6)),
          cursor: 'pointer',
          fontSize: rem(20),
          position: 'absolute',
          top: rem(0),
          height: '100%',
          right: rem(10),
          zIndex: 5,
        }}
        onClick={() => setShow(!show)}
      >
        {show ? (
          <FiEyeOff style={{transform: 'translate(0, 50%)'}} />
        ) : (
          <FiEye style={{transform: 'translate(0, 50%)'}} />
        )}
      </Box>
    </div>
  )
}

export function Avatar({
  address,
  boxSize,
  size = boxSize || ['88px', '80px'],
  ...props
}) {
  return address ? (
    <ChakraAvatar
      boxSize={size}
      src={`https://robohash.idena.io/${address?.toLowerCase()}`}
      bg="gray.50"
      borderRadius={['mobile', 'lg']}
      {...props}
    />
  ) : (
    <Box boxSize={size} bg="gray.50" rounded={['mobile', 'lg']}></Box>
  )
}

export function Tooltip(props) {
  return (
    <ChakraTooltip
      bg="black"
      color="white"
      fontSize="sm"
      px={2}
      py={1}
      rounded="md"
      hasArrow
      {...props}
    />
  )
}

const escape = keyframes`
  from { right: 0; }
  to { right: 100%; }
`

export function Toast({
  title,
  description,
  icon = 'info',
  status = 'info',
  actionContent,
  actionColor = status === 'error' ? 'red.500' : 'brandBlue.500',
  color,
  onAction,
  duration,
  ...props
}) {
  return (
    <Alert
      status={status}
      bg="white"
      boxShadow="0 3px 12px 0 rgba(83, 86, 92, 0.1), 0 2px 3px 0 rgba(83, 86, 92, 0.2)"
      color={color || 'brandGray.500'}
      fontSize="md"
      pl={4}
      pr={actionContent ? 2 : 5}
      pt="10px"
      pb={3}
      mb={5}
      minH="44px"
      rounded="lg"
      {...props}
    >
      <AlertIcon
        name={icon}
        size={5}
        color={color || (status === 'error' ? 'red.500' : 'blue.500')}
      />
      <Flex direction="column" align="flex-start" maxW={['90vw', 'sm']}>
        <AlertTitle fontWeight={500} lineHeight="base">
          {title}
        </AlertTitle>
        <AlertDescription
          color={color || 'muted'}
          lineHeight="base"
          textAlign="left"
          maxW={['77vw', 'none']}
          w="full"
          isTruncated
        >
          {description}
        </AlertDescription>
      </Flex>
      {actionContent && (
        <Button
          variant="ghost"
          color={actionColor}
          fontWeight={500}
          lineHeight="base"
          px={3}
          py="3/2"
          _hover={{bg: 'unset'}}
          _active={{bg: 'unset'}}
          _focus={{boxShadow: 'none'}}
          onClick={onAction}
        >
          {actionContent}
        </Button>
      )}
      <Box
        bg="gray.100"
        height="3px"
        roundedBottom={2}
        pos="absolute"
        bottom={0}
        left={0}
        right={0}
        animation={`${escape} ${duration}ms linear forwards`}
      />
    </Alert>
  )
}

export function Dialog({
  title,
  children,
  shouldShowCloseButton = false,
  // eslint-disable-next-line no-unused-vars
  isDesktop = true,
  ...props
}) {
  const variant = useBreakpointValue(['mobile', 'initial'])
  return (
    <Modal isCentered variant={variant} size="sm" {...props}>
      <ModalOverlay bg="xblack.080" />
      <ModalContent
        bg="white"
        color="brandGray.500"
        fontSize={['mobile', 'md']}
        px={[6, 8]}
        pb={[4, 8]}
        pt={6}
        mt={0}
        mx={[4, 'auto']}
        mb={[9, 0]}
        rounded="lg"
      >
        {title && <DialogHeader>{title}</DialogHeader>}
        {shouldShowCloseButton && <ModalCloseButton />}
        {children}
      </ModalContent>
    </Modal>
  )
}

export function DialogHeader(props) {
  return (
    <ModalHeader
      p={0}
      mb={2}
      fontSize={['20px', 'lg']}
      fontWeight={500}
      {...props}
    />
  )
}

export function DialogBody(props) {
  return <ModalBody p={0} mb={6} {...props} />
}

export function DialogFooter({children, ...props}) {
  return (
    <ModalFooter p={0} {...props}>
      <Stack isInline spacing={2} justify="flex-end" w={['100%', 'auto']}>
        {children}
      </Stack>
    </ModalFooter>
  )
}

export function QrScanner({isOpen, onScan, onClose}) {
  const QrReader = dynamic(() => import('react-qr-reader'), {
    ssr: false,
  })

  return (
    <Modal variant="mobile" isOpen={isOpen} size="sm">
      <ModalOverlay bg="gray.980" />
      <ModalContent bg="white" color="brandGray.500" fontSize="md" rounded="lg">
        <Heading fontSize="20px" margin="20px 0 20px 24px">
          Scan QR code
        </Heading>
        <QrReader style={{color: 'blue'}} delay={300} onScan={onScan} />
        <Flex w="100%" justify="center">
          <FlatButton syze="lg" mt="26px" mb="26px" onClick={onClose}>
            Cancel
          </FlatButton>
        </Flex>
      </ModalContent>
    </Modal>
  )
}

export function Skeleton(props) {
  return (
    <ChakraSkeleton
      startColor="gray.50"
      endColor="gray.100"
      w="full"
      {...props}
    />
  )
}

export function FillCenter(props) {
  return (
    <Flex
      direction="column"
      flex={1}
      align="center"
      justify="center"
      {...props}
    />
  )
}

export const VDivider = React.forwardRef(function VDivider(props, ref) {
  return (
    <Divider
      ref={ref}
      orientation="vertical"
      borderColor="gray.100"
      h={6}
      mx={0}
      {...props}
    />
  )
})

export function SmallText(props) {
  return <Text color="muted" fontSize="sm" {...props} />
}

export function ExternalLink({
  href,
  withArrow = true,
  textProps,
  children,
  ...props
}) {
  return (
    <Button
      variant="link"
      color="blue.500"
      fontWeight={500}
      alignSelf="flex-start"
      _hover={{background: 'transparent', textDecoration: 'underline'}}
      _focus={{
        outline: 'none',
      }}
      onClick={() => {
        const win = openExternalUrl(href)
        win.focus()
      }}
      {...props}
    >
      <Text
        as="span"
        lineHeight="4"
        textAlign="start"
        maxW="full"
        isTruncated
        {...textProps}
      >
        {children || href}
        {withArrow && <ChevronRightIcon boxSize={4} />}
      </Text>
    </Button>
  )
}

// eslint-disable-next-line react/display-name
export const TextLink = React.forwardRef(
  ({href, as, children, ...props}, ref) => (
    <NextLink href={href} as={as} passHref>
      <Link href={href} color="blue.500" ref={ref} {...props}>
        {children}
      </Link>
    </NextLink>
  )
)

export function SuccessAlert({icon, children, ...props}) {
  return (
    <Alert
      status="success"
      bg="green.010"
      borderWidth="1px"
      borderColor="green.050"
      fontWeight={500}
      rounded="md"
      px={3}
      py={2}
      {...props}
    >
      {icon || <AlertIcon color="green.500" boxSize={5} mr={3} />}
      {children}
    </Alert>
  )
}

export function ErrorAlert({children, ...props}) {
  return (
    <Alert
      status="error"
      bg="red.010"
      borderWidth="1px"
      borderColor="red.050"
      fontSize="md"
      fontWeight={500}
      rounded="md"
      px={3}
      py={2}
      {...props}
    >
      <InfoIcon color="red.500" boxSize="5" mr="3" />
      {children}
    </Alert>
  )
}

export function WarningAlert({children, ...props}) {
  return (
    <Alert
      status="warning"
      bg="warning.010"
      borderWidth="1px"
      borderColor="warning.050"
      fontSize="md"
      fontWeight={500}
      rounded="md"
      px={3}
      py={2}
      {...props}
    >
      <Flex>
        <InfoIcon color="warning.500" boxSize={5} mr={3} />
        {children}
      </Flex>
    </Alert>
  )
}

export function Spinner({size = 8}) {
  const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

  return (
    <>
      <Box
        display="inline-block"
        border="4px solid"
        borderColor="blackAlpha.100"
        borderLeftColor="blue.500"
        borderRadius="50%"
        w={size}
        h={size}
        animation={`${spin} 1.2s linear infinite`}
      ></Box>
    </>
  )
}

export function RoundedTh({isLeft, isRight, children, ...props}) {
  return (
    <Th
      textTransform="none"
      fontSize="md"
      fontWeight={400}
      bg="none"
      color="muted"
      py={2}
      px={3}
      borderBottom="none"
      letterSpacing={0}
      position="relative"
      {...props}
    >
      {children}
      <Box
        position="absolute"
        inset={0}
        bg="gray.50"
        w="full"
        zIndex="hide"
        borderLeftRadius={isLeft ? 'md' : 'none'}
        borderRightRadius={isRight ? 'md' : 'none'}
      />
    </Th>
  )
}

export function GoogleTranslateButton({
  phrases = [],
  text = encodeURIComponent(phrases.filter(Boolean).join('\n\n')),
  locale,
  children,
  ...props
}) {
  return (
    <IconButton
      icon={<GtranslateIcon boxSize={5} />}
      _hover={{background: 'transparent'}}
      onClick={() => {
        openExternalUrl(
          `https://translate.google.com/#view=home&op=translate&sl=auto&tl=${locale}&text=${text}`
        )
      }}
      {...props}
    >
      {children || 'Google Translate'}
    </IconButton>
  )
}

export function NumberInput({
  min,
  max = Number.MAX_VALUE,
  preventInvalidInput = false,
  onChange,
  onClamp,
  ...props
}) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      onBlur={({target}) => {
        const {id, value} = target
        if (!target.checkValidity()) {
          const clampedValue = clampValue(min, max, Number(value))
          // eslint-disable-next-line no-unused-expressions
          onChange?.({
            target: {
              id,
              value: clampedValue,
            },
          })
          if (onClamp) onClamp(clampedValue)
        }
      }}
      onChange={e => {
        if (preventInvalidInput) {
          if (e.target.checkValidity()) onChange(e)
          // eslint-disable-next-line no-unused-expressions
        } else onChange?.(e)
      }}
      {...props}
    />
  )
}

export function ChainedInputGroup({addon, children, ...props}) {
  const {isDisabled} = props

  return (
    <InputGroup flex={1} {...props}>
      {addon ? (
        <>
          <ChainedInput {...props} />
          <ChainedInputAddon isDisabled={isDisabled}>%</ChainedInputAddon>
        </>
      ) : (
        children
      )}
    </InputGroup>
  )
}

export function ChainedInput(props) {
  const {isDisabled, bg, _hover} = props

  const borderRightColor = isDisabled ? 'gray.50' : bg

  return (
    <Input
      borderRightColor={borderRightColor}
      borderTopRightRadius={0}
      borderBottomRightRadius={0}
      _hover={{
        borderRightColor,
        ..._hover,
      }}
      {...props}
    />
  )
}

export function ChainedInputAddon({isDisabled, bg = 'white', ...props}) {
  return (
    <InputRightAddon
      bg={isDisabled ? 'gray.50' : bg}
      borderColor="gray.100"
      color="muted"
      h={8}
      px={3}
      {...props}
    />
  )
}

export function ChainedNumberInput(props) {
  const {isDisabled, bg, _hover} = props

  const borderRightColor = isDisabled ? 'gray.50' : bg

  return (
    <NumberInput
      borderRightColor={borderRightColor}
      borderTopRightRadius={0}
      borderBottomRightRadius={0}
      _hover={{
        borderRightColor,
        ..._hover,
      }}
      {...props}
    />
  )
}

export function Badge(props) {
  return (
    <Flex
      as={ChakraBadge}
      align="center"
      justify="center"
      bg="blue.500"
      color="white"
      fontSize={8}
      fontWeight={700}
      rounded={4}
      px={1}
      py={1 / 2}
      h={4}
      minW={4}
      {...props}
    />
  )
}

export function Menu({children, zIndex, ...props}) {
  return (
    <ChakraMenu autoSelect={false} placement="bottom-end" {...props}>
      <MenuButton>
        <MoreIcon boxSize={5} color="muted" />
      </MenuButton>
      <MenuList zIndex={zIndex}>{children}</MenuList>
    </ChakraMenu>
  )
}

export const HDivider = React.forwardRef(function HDivider(props, ref) {
  return <Divider ref={ref} borderColor="gray.100" my={0} {...props} />
})

const FilterContext = React.createContext()

export function FilterButtonList({value, onChange, children, ...props}) {
  return (
    <HStack {...props}>
      <FilterContext.Provider value={{value, onChange}}>
        {children}
      </FilterContext.Provider>
    </HStack>
  )
}

export function FilterButton({value, onClick, ...props}) {
  const {
    value: currentValue,
    onChange: onChangeCurrentValue,
  } = React.useContext(FilterContext)

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

const StatusLabel = {
  None: 0,
  Online: 1,
  Restricted: 2,
  Offline: 3,
}

export function ApiStatus(props) {
  const settings = useSettingsState()
  const {t} = useTranslation()
  const epoch = useEpoch()
  const [{state: identityState}] = useIdentity()

  let bg = 'xwhite.010'
  let color = 'gray.300'
  let text = t('Loading...')
  let status = StatusLabel.None

  const undefinedOrInvite = [
    IdentityStatus.Undefined,
    IdentityStatus.Invite,
  ].includes(identityState)

  if (settings.apiKeyState === ApiKeyStates.OFFLINE) {
    bg = 'red.020'
    color = 'red.500'
    text = t('Offline')
    status = StatusLabel.Offline
  } else if (
    settings.apiKeyState === ApiKeyStates.RESTRICTED &&
    !undefinedOrInvite
  ) {
    bg = 'warning.020'
    color = 'warning.500'
    text = t('Restricted')
    status = StatusLabel.Restricted
  } else if (
    settings.apiKeyState === ApiKeyStates.ONLINE ||
    settings.apiKeyState === ApiKeyStates.EXTERNAL ||
    (settings.apiKeyState === ApiKeyStates.RESTRICTED && undefinedOrInvite)
  ) {
    bg = 'green.020'
    color = 'green.500'
    text = t('Online')
    status = StatusLabel.Online
  }

  const restrictedOrOnline = [
    StatusLabel.Restricted,
    StatusLabel.Online,
  ].includes(status)

  return (
    <Flex position={['absolute', 'initial']} {...props}>
      <Tooltip
        label={
          status === StatusLabel.Restricted
            ? t(
                'You cannot use the shared node for the upcoming validation ceremony.'
              )
            : t(
                'Access to the shared node will be expired after the validation ceremony {{date}}',
                {
                  date: epoch
                    ? new Date(epoch.nextValidation).toLocaleString()
                    : '',
                }
              )
        }
        placement="right"
        zIndex="tooltip"
        bg="graphite.500"
        width={200}
        isDisabled={!restrictedOrOnline || undefinedOrInvite}
      >
        <Flex bg={bg} borderRadius="xl" px={3} py={[1, 1 / 2]} fontSize={13}>
          {status === StatusLabel.Restricted ? (
            <Flex align="baseline">
              <TextLink
                href="/node/restricted"
                color={color}
                fontWeight={500}
                lineHeight={rem(18)}
                _hover={{
                  textDecoration: 'none',
                }}
              >
                {text}
              </TextLink>
            </Flex>
          ) : (
            <Flex align="baseline">
              <Text color={color} fontWeight={500} lineHeight={rem(18)}>
                {text}
              </Text>
            </Flex>
          )}
        </Flex>
      </Tooltip>
    </Flex>
  )
}

export function MobileApiStatus(props) {
  return <ApiStatus display={['initial', 'none']} {...props} />
}

export function DrawerFormHelper({label, value, ...props}) {
  return (
    <Flex justify="space-between" {...props}>
      <DrawerFormHelperText>{label}</DrawerFormHelperText>
      <DrawerFormHelperValue>{value}</DrawerFormHelperValue>
    </Flex>
  )
}

export function DrawerFormHelperText(props) {
  return <FormHelperText color="muted" fontSize="md" {...props} />
}

export function DrawerFormHelperValue(props) {
  return <FormHelperText color="gray.500" fontSize="md" {...props} />
}

export function DnaInput(props) {
  const {isDisabled} = props

  return (
    <ChainedInputGroup>
      <ChainedNumberInput min={0} step="any" {...props} />
      <ChainedInputAddon isDisabled={isDisabled}>iDNA</ChainedInputAddon>
    </ChainedInputGroup>
  )
}
