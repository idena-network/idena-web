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
  Image,
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
  PseudoBox,
  FormControl,
  useTheme,
} from '@chakra-ui/core'
import {borderRadius} from 'polished'
import {FiEye, FiEyeOff} from 'react-icons/fi'
import {rem} from '../theme'

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
  return (
    <ChakraDrawer {...props}>
      <DrawerOverlay bg="xblack.080" />
      <DrawerContent px={8} pt={12} pb={4} maxW={360}>
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
  return (
    <ChakraInput
      alignItems="center"
      borderColor="gray.300"
      fontSize="md"
      lineHeight="short"
      px={3}
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

export function Select(props) {
  return (
    <ChakraSelect
      borderColor="gray.300"
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
      <Input type={show ? 'text' : 'password'} {...props} />
      <Box
        style={{
          ...borderRadius('right', rem(6)),
          cursor: 'pointer',
          fontSize: rem(20),
          position: 'absolute',
          top: rem(-3),
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

export function Avatar({address, ...props}) {
  return address ? (
    <Image
      size={rem(80)}
      src={`https://robohash.idena.io/${address}`}
      bg="gray.50"
      rounded="lg"
      ignoreFallback
      {...props}
    />
  ) : (
    <PseudoBox size={rem(80)} bg="gray.50" rounded="lg"></PseudoBox>
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

export function Toast({
  title,
  description,
  icon = 'info',
  status = 'info',
  actionContent,
  actionColor = status === 'error' ? 'red.500' : 'brandBlue.500',
  onAction,
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
      <AlertIcon name={icon} size={5} />
      <Flex direction="column" align="flex-start" maxW="sm">
        <AlertTitle fontWeight={500} lineHeight="base">
          {title}
        </AlertTitle>
        <AlertDescription color="muted" lineHeight="base">
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

export function Skeleton(props) {
  const {colors} = useTheme()
  return (
    <ChakraSkeleton
      colorStart={colors.gray[100]}
      colorEnd={colors.gray[300]}
      w="full"
      {...props}
    />
  )
}
