/* eslint-disable react/prop-types */
import React from 'react'
import PropTypes from 'prop-types'
import {transparentize, darken} from 'polished'
import {Button as ChakraButton, Box} from '@chakra-ui/react'
import theme, {rem} from '../theme'

function Button({size, disabled, danger, variant = 'primary', css, ...props}) {
  const isPrimary = variant === 'primary'
  const bgColor = danger ? theme.colors.danger : theme.colors.primary

  const bg = isPrimary ? bgColor : transparentize(0.88, bgColor)
  const color = isPrimary ? theme.colors.white : theme.colors.primary

  return (
    <>
      <button type="button" disabled={disabled} style={css} {...props} />
      <style jsx>{`
        button {
          background: ${bg};
          border: none;
          border-radius: 6px;
          color: ${color};
          cursor: pointer;
          font-size: ${size};
          padding: ${rem(6)} ${rem(16)};
          outline: none;
          transition: all 0.3s ease;
          transition-property: background, color;
          min-height: ${rem(32)};
        }
        button:hover {
          background: ${darken(0.1, bg)};
          color: ${darken(0.05, color)};
        }
        button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      `}</style>
    </>
  )
}
Button.defaultProps = {
  ...theme.Button,
}
Button.propTypes = {
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  disabled: PropTypes.bool,
  danger: PropTypes.bool,
  variant: PropTypes.oneOf(['primary', 'secondary']),
  // eslint-disable-next-line react/forbid-prop-types
  css: PropTypes.object,
}

function FlatButton({size, color, disabled, css, ...props}) {
  return (
    <>
      <button type="button" disabled={disabled} style={css} {...props} />
      <style jsx>{`
        button {
          background: none;
          border: none;
          border-radius: 6px;
          color: ${color};
          cursor: ${disabled ? 'not-allowed' : 'pointer'};
          font-size: ${size};
          padding: 0;
          outline: none;
          ${disabled && `opacity: 0.5`};
          transition: background 0.3s ease, color 0.3s ease;
        }
        button:hover {
          color: ${darken(0.05, color)};
          opacity: 0.9;
          ${disabled && `opacity: 0.5`};
        }
      `}</style>
    </>
  )
}
FlatButton.defaultProps = {
  ...theme.Button,
}
FlatButton.propTypes = Button.propTypes

const BaseButton = React.forwardRef((props, ref) => (
  <ChakraButton
    ref={ref}
    fontWeight={500}
    h={8}
    px={4}
    py="3/2"
    rounded="md"
    {...props}
  />
))
BaseButton.displayName = 'BaseButton'

export const PrimaryButton = React.forwardRef((props, ref) => (
  <BaseButton ref={ref} colorScheme="brandBlue" color="white" {...props} />
))
PrimaryButton.displayName = 'PrimaryButton'

// eslint-disable-next-line react/display-name
export const SecondaryButton = React.forwardRef((props, ref) => (
  <Box
    ref={ref}
    as="button"
    bg="brandBlue.10"
    color="brandBlue.500"
    fontWeight={500}
    fontSize={13}
    h={8}
    px={4}
    py="3/2"
    rounded="md"
    transition="all 0.2s cubic-bezier(.08,.52,.52,1)"
    _hover={{bg: 'brandBlue.20'}}
    _active={{
      bg: 'brandBlue.50',
      transform: 'scale(0.98)',
    }}
    _focus={{
      shadow: 'outline',
      outline: 'none',
    }}
    _disabled={{
      bg: 'gray.50',
      color: 'rgb(150 153 158)',
    }}
    // eslint-disable-next-line react/destructuring-assignment
    disabled={props.isDisabled}
    {...props}
  />
))

export const IconButton2 = React.forwardRef((props, ref) => (
  <ChakraButton
    ref={ref}
    size="sm"
    fontSize="md"
    variant="outline"
    colorScheme="blue"
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
IconButton2.displayName = 'IconButton2'

export function FlatButton2({children, ...props}) {
  return (
    <ChakraButton
      size="sm"
      fontSize="md"
      variant="link"
      colorScheme="blue"
      color="blue.500"
      fontWeight={400}
      border="none"
      borderColor="transparent"
      borderRadius="md"
      justifyContent="flex-start"
      {...props}
    >
      {children}
    </ChakraButton>
  )
}

export function TabButton(props) {
  return (
    <ChakraButton
      bg="white"
      color="muted"
      fontWeight={500}
      size="sm"
      fontSize="md"
      _active={{bg: 'gray.50', color: 'brand.blue'}}
      _hover={{bg: 'gray.50', color: 'brand.blue'}}
      variant="ghost"
      colorScheme="gray"
      {...props}
    />
  )
}

export {FlatButton}
