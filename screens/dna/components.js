/* eslint-disable react/prop-types */
import {Box, Stack, Text} from '@chakra-ui/core'

export function DnaDialogStat({label, value, children, ...props}) {
  return (
    <Stack
      isInline
      spacing={4}
      align="center"
      justify="space-between"
      bg="gray.50"
      px={5}
      py={4}
      {...props}
    >
      <Box>
        {label && <Text color="muted">{label}</Text>}
        {value && <Text wordBreak="break-all">{value}</Text>}
      </Box>
      {children}
    </Stack>
  )
}
