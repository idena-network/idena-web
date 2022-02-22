/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
import React from 'react'
import {Button as ChakraButton, Flex, Box, Button} from '@chakra-ui/react'
import {InfoIcon} from './icons'

export const PrimaryButton = React.forwardRef((props, ref) => (
  <Button ref={ref} variant="primary" {...props} />
))

export const SecondaryButton = React.forwardRef((props, ref) => (
  <Button ref={ref} variant="secondary" {...props} />
))

export const IconButton = React.forwardRef((props, ref) => (
  <ChakraButton
    ref={ref}
    size="sm"
    fontSize="md"
    variant="outline"
    colorScheme="blue"
    fontWeight={500}
    leftIcon={props.icon}
    color="blue.500"
    border="none"
    borderColor="transparent"
    borderRadius="md"
    justifyContent="flex-start"
    _hover={{
      bg: 'blue.50',
    }}
    {...props}
  />
))

export function FlatButton({children, ...props}) {
  return (
    <ChakraButton
      size="sm"
      fontSize={['mobile', 'md']}
      variant="link"
      colorScheme="brandBlue"
      color="brandBlue.500"
      fontWeight={400}
      border="none"
      borderColor="transparent"
      borderRadius="md"
      justifyContent="flex-start"
      _hover={{color: 'brandBlue.700'}}
      {...props}
    >
      {children}
    </ChakraButton>
  )
}

export function CornerButton({
  children,
  label,
  isDisabled = false,
  isLoading = false,
  isDark = false,
  onClick = {},
  ...props
}) {
  // eslint-disable-next-line no-nested-ternary
  const colorBg = isDisabled
    ? isDark
      ? 'xwhite.010'
      : 'gray.50'
    : isDark
    ? 'brandBlue.032'
    : 'brandBlue.10'
  // eslint-disable-next-line no-nested-ternary
  const colorText = isDisabled
    ? isDark
      ? 'xwhite.024'
      : 'gray.200'
    : isDark
    ? 'white'
    : 'gray.500'

  return (
    <Box
      as="button"
      isDisabled={isDisabled}
      isLoading={isLoading}
      onClick={isDisabled || isLoading ? () => {} : onClick}
      position="fixed"
      bottom="0"
      right="0"
      h={24}
      w={24}
      background={colorBg}
      borderTopLeftRadius="90%"
      {...props}
    >
      <Flex
        color={colorText}
        direction="column"
        align="center"
        justify="flex-end"
        h="100%"
        pl="16px"
        pb="16px"
        fontSize="15px"
        fontWeight="500"
      >
        {children}
        {label}
      </Flex>
    </Box>
  )
}

export const InfoButton = React.forwardRef((props, ref) => (
  <IconButton
    ref={ref}
    icon={<InfoIcon boxSize={5} />}
    color="brandBlue.500"
    bg="unset"
    fontSize="20px"
    minW={5}
    w={5}
    h={5}
    _active={{
      bg: 'unset',
    }}
    _hover={{
      bg: 'unset',
    }}
    _focus={{
      outline: 'none',
    }}
    {...props}
  />
))
