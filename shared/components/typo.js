import React from 'react'
import PropTypes from 'prop-types'
import {Heading as ChakraHeading} from '@chakra-ui/react'
import theme, {rem} from '../theme'
import {Dim} from './box'

export function Heading({
  color,
  fontSize,
  fontWeight,
  margin = 0,
  style,
  children,
}) {
  return (
    <h1 style={style}>
      {children}
      <style jsx>{`
        h1 {
          display: inline-block;
          color: ${color};
          font-size: ${fontSize};
          font-weight: ${fontWeight};
          margin: ${margin};
        }
      `}</style>
    </h1>
  )
}

Heading.defaultProps = {
  ...theme.Heading,
}

Heading.propTypes = {
  color: PropTypes.string,
  fontSize: PropTypes.string,
  fontWeight: PropTypes.number,
  margin: Dim,
  // eslint-disable-next-line react/forbid-prop-types
  style: PropTypes.object,
  children: PropTypes.node,
}

// eslint-disable-next-line react/prop-types
export function SubHeading({children, ...props}) {
  return (
    <ChakraHeading
      as="h2"
      display="inlineBlock"
      color="gray.500"
      fontSize="lg"
      fontWeight={500}
      lineHeight={6}
      m="0.25em 0"
      w="auto"
      {...props}
    >
      {children}
    </ChakraHeading>
  )
}

export function Text({color, fontSize, fontWeight, lineHeight, css, ...props}) {
  return (
    <>
      <span {...props} style={css} />
      <style jsx>{`
        span {
          display: inline-block;
          color: ${color};
          font-size: ${fontSize};
          font-weight: ${fontWeight};
          line-height: ${lineHeight};
        }
      `}</style>
    </>
  )
}

Text.defaultProps = {
  ...theme.Text,
}

Text.propTypes = {
  color: PropTypes.string,
  fontSize: PropTypes.string,
  fontWeight: PropTypes.number,
  lineHeight: PropTypes.string,
  // eslint-disable-next-line react/forbid-prop-types
  css: PropTypes.object,
}

// eslint-disable-next-line react/prop-types
export function BlockText({css, ...props}) {
  return <Text {...props} css={{...css, display: 'block'}} />
}

export function PageTitle(props) {
  return <Heading margin={`${rem(24)} 0 ${rem(24)}`} {...props} />
}
