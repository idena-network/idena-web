import {Box} from '@chakra-ui/core'
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
