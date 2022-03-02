import {Box, Heading} from '@chakra-ui/react'

// eslint-disable-next-line react/prop-types
export function Section({title, children, ...props}) {
  return (
    <Box mt={8} {...props}>
      <Heading
        as="h1"
        fontSize={['20px', 'lg']}
        fontWeight={500}
        textAlign="start"
        mb={[0, '0.5em']}
      >
        {title}
      </Heading>
      <Box mt={[5, 2]}>{children}</Box>
    </Box>
  )
}
