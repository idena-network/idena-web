import React, {forwardRef} from 'react'
import PropTypes from 'prop-types'
import {borderRadius} from 'polished'

import {useTheme} from '@emotion/react'
import {Box} from '.'
import theme, {rem} from '../theme'
import {IconButton} from './button'

// eslint-disable-next-line react/display-name
export const Menu = forwardRef((props, ref) => (
  <MenuItems ref={ref} w={null} {...props}></MenuItems>
))

export function MenuItems({ref, ...props}) {
  return (
    <Box
      bg={theme.colors.white}
      py={theme.spacings.small}
      css={{
        ...borderRadius('top', '10px'),
        ...borderRadius('bottom', '10px'),
        boxShadow:
          '0 4px 6px 0 rgba(83, 86, 92, 0.24), 0 0 2px 0 rgba(83, 86, 92, 0.2)',
      }}
      w="145px"
      ref={ref}
      {...props}
    />
  )
}

MenuItems.propTypes = {
  ref: PropTypes.object,
}

export function MenuItem({icon, danger, ...props}) {
  const chakraTheme = useTheme()
  return (
    <IconButton
      w="100%"
      color="brandGray.080"
      icon={React.cloneElement(icon, {
        style: {
          color: danger
            ? chakraTheme.colors.red['500']
            : chakraTheme.colors.brandBlue['500'],
          marginRight: rem(10),
        },
      })}
      _hover={{bg: 'gray.50'}}
      _active={{bg: 'gray.50'}}
      {...props}
    />
  )
}

MenuItem.propTypes = {
  icon: PropTypes.node,
  danger: PropTypes.bool,
}
