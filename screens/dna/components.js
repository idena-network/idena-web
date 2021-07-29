/* eslint-disable react/prop-types */
import {Box, Stack, Text, Link} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {LaptopIcon} from '../../shared/components/icons'

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

export function DnaAppUrl({url}) {
  const {t} = useTranslation()
  return (
    <Stack
      isInline
      align="center"
      spacing={3}
      color="muted"
      px={2}
      py={1.5}
      mt={16}
    >
      <LaptopIcon name="laptop" boxSize={5} />
      <Link href={url}>{t('Open in Idena app')}</Link>
    </Stack>
  )
}
