/* eslint-disable react/prop-types */
import React, {useState} from 'react'
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
  useTheme,
  Divider,
  Text,
  Link,
  keyframes,
  useBreakpointValue,
} from '@chakra-ui/react'
import {borderRadius} from 'polished'
import {FiEye, FiEyeOff} from 'react-icons/fi'
import NextLink from 'next/link'
import dynamic from 'next/dynamic'
import {rem} from '../theme'
import {ChevronDownIcon} from './icons'
import {openExternalUrl} from '../utils/utils'
import {Heading} from './typo'
import {FlatButton} from './button'

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
  const placement = useBreakpointValue(['bottom', 'right'])
  const maxWidth = useBreakpointValue(['fit-content!important', 360])

  return (
    <ChakraDrawer placement={placement} {...props}>
      <DrawerOverlay bg="xblack.080" />
      <DrawerContent
        mx={[3, 0]}
        mb={[9, 0]}
        px={[6, 8]}
        pt={[6, 12]}
        pb={4}
        maxW={maxWidth}
        borderRadius={['8px', 0]}
      >
        {isCloseable && <DrawerCloseButton />}
        {children}
      </DrawerContent>
    </ChakraDrawer>
  )
}
export function DrawerHeader(props) {
  return <ChakraDrawerHeader p={0} mb={3} {...props} />
}

export function DrawerBody(props) {
  return <ChakraDrawerBody p={0} {...props} />
}

export function DrawerFooter(props) {
  return <ChakraDrawerFooter p={0} {...props} />
}

export function FormLabel(props) {
  return <ChakraFormLabel fontWeight={500} color="brandGray.500" {...props} />
}

export function FormControlWithLabel({label, children, ...props}) {
  return (
    <FormControl {...props}>
      <FormLabel color="brandGray.500" mb={2}>
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
  return (
    <ChakraSelect
      borderColor="gray.100"
      fontSize="md"
      lineHeight="short"
      h={8}
      _placeholder={{
        color: 'muted',
      }}
      _disabled={{
        bg: 'gray.50',
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
      <Input type={show ? 'text' : 'password'} opacity={[0.8, 1]} {...props} />
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

export function Avatar({address, size = ['88px', '80px'], ...props}) {
  return address ? (
    <ChakraAvatar
      boxSize={size}
      src={`https://robohash.idena.io/${address}`}
      bg="gray.50"
      borderRadius={['mobile', 'lg']}
      {...props}
    />
  ) : (
    <Box w={size} h={size} bg="gray.50" rounded={['mobile', 'lg']}></Box>
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
  color = status === 'error' ? 'red.500' : 'brandBlue.500',
  onAction,
  duration,
  ...props
}) {
  return (
    <Alert
      status={status}
      bg="white"
      boxShadow="0 3px 12px 0 rgba(83, 86, 92, 0.1), 0 2px 3px 0 rgba(83, 86, 92, 0.2)"
      color="brandGray.500"
      fontSize="md"
      pl={4}
      pr={actionContent ? 2 : 5}
      pt={rem(10)}
      pb={3}
      mb={5}
      minH={rem(44)}
      rounded="lg"
      {...props}
    >
      <AlertIcon name={icon} size={5} color={color || 'blue.500'} />
      <Flex direction="column" align="flex-start" maxW="sm">
        <AlertTitle fontWeight={500} lineHeight="base">
          {title}
        </AlertTitle>
        <AlertDescription
          color={color || 'muted'}
          lineHeight="base"
          textAlign="left"
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
  ...props
}) {
  return (
    <Modal isCentered size="sm" {...props}>
      <ModalOverlay bg="xblack.080" />
      <ModalContent
        bg="white"
        color="brandGray.500"
        fontSize="md"
        p={8}
        pt={6}
        my={0}
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
  return <ModalHeader p={0} mb={2} fontSize="lg" fontWeight={500} {...props} />
}

export function DialogBody(props) {
  return <ModalBody p={0} mb={6} {...props} />
}

export function DialogFooter({children, ...props}) {
  return (
    <ModalFooter p={0} {...props}>
      <Stack isInline spacing={2} justify="flex-end">
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
  const {colors} = useTheme()
  return (
    <ChakraSkeleton
      startColor={colors.gray[100]}
      endColor={colors.gray[300]}
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

export function ExternalLink({href, children, ...props}) {
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
      <Text as="span" lineHeight="short" mt="-2px">
        {children || href}
      </Text>
      <ChevronDownIcon boxSize={4} transform="rotate(-90deg)" />
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

export function SuccessAlert({children, ...props}) {
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
      <AlertIcon name="info" color="green.500" size={5} mr={3} />
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
      fontWeight={500}
      rounded="md"
      px={3}
      py={2}
      {...props}
    >
      <AlertIcon name="info" color="red.500" size={5} mr={3}></AlertIcon>
      {children}
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
