/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
import React from 'react'
import {Button as ChakraButton, Button} from '@chakra-ui/react'

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
  ></ChakraButton>
))

export function FlatButton({children, ...props}) {
  return (
    <ChakraButton
      size="sm"
      fontSize="md"
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
