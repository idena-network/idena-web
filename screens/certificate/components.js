/* eslint-disable react/prop-types */
import {Box, Skeleton} from '@chakra-ui/react'
import {CertificateType} from '../../shared/types'

function CertificateTypeLabelLayout(props) {
  return (
    <Box
      position="absolute"
      transform="rotate(-45deg)"
      top={7}
      left={-9}
      bg="red.500"
      fontSize="12px"
      letterSpacing="2px"
      color="white"
      textTransform="uppercase"
      px={10}
      py={3 / 2}
      textAlign="center"
      w={40}
      {...props}
    />
  )
}

export function CertificateTypeTitle(type) {
  switch (type) {
    case CertificateType.Easy:
      return 'Easy'
    case CertificateType.Medium:
      return 'Medium'
    case CertificateType.Hard:
      return 'Hard'
    default:
      return ''
  }
}

export function CertificateTypeLabel({type}) {
  switch (type) {
    case CertificateType.Easy:
      return (
        <CertificateTypeLabelLayout bg="red.500">
          {CertificateTypeTitle(type)}
        </CertificateTypeLabelLayout>
      )
    case CertificateType.Medium:
      return (
        <CertificateTypeLabelLayout bg="gray.500">
          {CertificateTypeTitle(type)}
        </CertificateTypeLabelLayout>
      )
    case CertificateType.Hard:
      return (
        <CertificateTypeLabelLayout bg="orange.500">
          {CertificateTypeTitle(type)}
        </CertificateTypeLabelLayout>
      )

    default:
      return (
        <Skeleton
          position="absolute"
          transform="rotate(-45deg)"
          w={40}
          h={8}
          top={7}
          left={-9}
        />
      )
  }
}
