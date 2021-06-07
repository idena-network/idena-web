/* eslint-disable react/prop-types */
import {Box, Flex, Text} from '@chakra-ui/core'

export function DnaDialogStat({label, value, children, ...props}) {
  return (
    <Flex
      align="center"
      justify="space-between"
      bg="gray.50"
      px={5}
      py={4}
      {...props}
    >
      <Box>
        {label && <Text color="muted">{label}</Text>}
        {value && <Text>{value}</Text>}
      </Box>
      {children}
    </Flex>
  )
}
