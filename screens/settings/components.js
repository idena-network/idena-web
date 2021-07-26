import {Box, Button} from '@chakra-ui/react'
import {margin, rem} from 'polished'
import {SubHeading} from '../../shared/components'
import theme from '../../shared/theme'

// eslint-disable-next-line react/prop-types
export function Section({title, children}) {
  return (
    <Box my={rem(theme.spacings.medium32)}>
      <SubHeading css={margin(0, 0, theme.spacings.small, 0)}>
        {title}
      </SubHeading>
      <Box my={rem(theme.spacings.small8)}>{children}</Box>
    </Box>
  )
}

export function TabButton(props) {
  return (
    <Button
      role="radio"
      bg="white"
      color="muted"
      fontWeight={500}
      size="sm"
      fontSize="md"
      _active={{bg: 'gray.50', color: 'brand.blue'}}
      _hover={{bg: 'gray.50', color: 'brand.blue'}}
      {...props}
      variant="ghost"
      colorScheme="gray"
    />
  )
}
