/* eslint-disable react/prop-types */
import * as React from 'react'
import {
  Box,
  Stack,
  Text,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
} from '@chakra-ui/react'
import {InfoIcon} from '../../shared/components/icons'
import {Avatar} from '../../shared/components/components'

export function DnaDialogAlert(props) {
  return (
    <Stack
      isInline
      align="center"
      bg="red.020"
      borderColor="red.500"
      borderWidth={1}
      borderRadius="md"
      px={3}
      py={2}
      mb={5}
    >
      <InfoIcon boxSize={4} color="red.500" />
      <Text fontWeight={500} {...props} />
    </Stack>
  )
}

export function DnaDialogAlertText(props) {
  return (
    <Box color="red.500" fontWeight={500} fontSize="sm" mt={1} {...props} />
  )
}

export function DnaDialogAvatar({address}) {
  return (
    <Avatar
      address={address}
      size={10}
      bg="white"
      borderRadius="md"
      borderWidth={1}
      borderColor="brandGray.016"
    />
  )
}

export function SimpleDnaDialogStat({label, value, ...props}) {
  return (
    <DnaDialogStat {...props}>
      <DnaDialogStatLabel>{label}</DnaDialogStatLabel>
      <DnaDialogStatValue>{value}</DnaDialogStatValue>
    </DnaDialogStat>
  )
}

export function MediaDnaDialogStat({label, value, children, ...props}) {
  return (
    <HStack spacing={4} align="center" bg="gray.50" px={5} py={4} {...props}>
      <Stat p={0}>
        <DnaDialogStatLabel>{label}</DnaDialogStatLabel>
        <DnaDialogStatValue>{value}</DnaDialogStatValue>
      </Stat>
      {children}
    </HStack>
  )
}

export function DnaDialogStat(props) {
  return <Stat bg="gray.50" px={5} py={4} {...props} />
}

export function DnaDialogStatLabel(props) {
  return <StatLabel color="muted" fontSize="md" {...props} />
}

export function DnaDialogStatValue(props) {
  return (
    <StatNumber
      fontSize="md"
      fontWeight={500}
      wordBreak="break-all"
      {...props}
    />
  )
}
