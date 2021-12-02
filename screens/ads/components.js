/* eslint-disable react/prop-types */
import React, {forwardRef} from 'react'
import {
  Box,
  Flex,
  Stack,
  StatLabel,
  StatNumber,
  FormControl,
  Heading,
  Tab,
  NumberInputField,
  NumberInput,
  Textarea,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {rem} from '../../shared/theme'
import {FormLabel, Input} from '../../shared/components/components'

export function AdStatLabel(props) {
  return <StatLabel color="muted" fontSize="md" {...props} />
}

export function AdStatNumber(props) {
  return <StatNumber fontSize="md" fontWeight={500} {...props} />
}

export function SmallTargetFigure({children = 'Any', ...props}) {
  return (
    <AdStatNumber fontSize={rem(11)} {...props}>
      {children}
    </AdStatNumber>
  )
}

export function AdList(props) {
  return <Stack {...props} />
}

export function AdEntry(props) {
  return <Box {...props} />
}

export function NoAds() {
  const {t} = useTranslation()
  return (
    <Flex
      flexDirection="column"
      align="center"
      alignSelf="stretch"
      justify="center"
      color="muted"
      my="auto"
    >
      {t(`You haven't created any ads yet`)}
    </Flex>
  )
}

// eslint-disable-next-line react/display-name
export const AdFormTab = forwardRef(({isSelected, ...props}, ref) => (
  <Tab
    ref={ref}
    isSelected={isSelected}
    color="muted"
    fontWeight={500}
    py={2}
    px={4}
    rounded="md"
    _selected={{bg: 'brandBlue.50', color: 'brandBlue.500'}}
    {...props}
  />
))

// eslint-disable-next-line react/prop-types
export function FormSection(props) {
  return <Box {...props} />
}

export function FormSectionTitle(props) {
  return (
    <Heading
      as="h3"
      py="10px"
      mb={2}
      fontSize="14px"
      fontWeight={500}
      {...props}
    />
  )
}

// eslint-disable-next-line react/prop-types
export function AdFormField({label, id, children}) {
  return (
    <FormControl as={Flex}>
      <FormLabel htmlFor={id} color="muted" w={rem(120)} pt={2}>
        {label}
      </FormLabel>
      <Box w={rem(360)}>
        {React.cloneElement(children, {
          id,
          fontWeight: 500,
        })}
      </Box>
    </FormControl>
  )
}

export function AdInput(props) {
  return <Input px={3} py={2} {...props} />
}

export function AdTextarea(props) {
  return <Textarea px={3} py={2} {...props} />
}

// eslint-disable-next-line react/prop-types
export function AdNumberInput(props) {
  return (
    <NumberInput w="100%" {...props}>
      <NumberInputField inputMode="numeric" pattern="[0-9]*" px={3} py={2} />
    </NumberInput>
  )
}

export function AdFooter(props) {
  return (
    <Box
      bg="white"
      borderTop="1px"
      borderTopColor="gray.100"
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      px={4}
      py={3}
    >
      <Stack isInline spacing={2} justify="flex-end" {...props} />
    </Box>
  )
}
