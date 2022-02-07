import {Box, Heading} from '@chakra-ui/react'

// eslint-disable-next-line react/prop-types
export function Section({title, children}) {
  return (
    <Box my={8}>
      <Heading
        as="h1"
        fontSize="lg"
        fontWeight={500}
        textAlign={['center', 'start']}
        mb={[0, '0.5em']}
      >
        {title}
      </Heading>
      <Box my="8px">{children}</Box>
    </Box>
  )
}
