import React, {forwardRef} from 'react'
import PropTypes from 'prop-types'
import {Flex, Box} from '@chakra-ui/react'
// import Box, {Dim} from './box'

// eslint-disable-next-line react/display-name
export const Absolute = forwardRef(
  // eslint-disable-next-line react/prop-types
  ({bg, top, left, bottom, right, zIndex, width, css, ...props}, ref) => (
    <Box
      css={{
        ...css,
        background: bg,
        position: 'absolute',
        left,
        right,
        top,
        bottom,
        zIndex,
        width,
      }}
      ref={ref}
      {...props}
    />
  )
)

export function Fill(props) {
  return (
    <Flex
      position="absolute"
      top={0}
      left={0}
      bottom={0}
      right={0}
      zIndex={1}
      justify="center"
      align="center"
      {...props}
    />
  )
}

Fill.propTypes = {
  bg: PropTypes.string,
  zIndex: PropTypes.number,
}
