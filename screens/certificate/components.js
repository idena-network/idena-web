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

export function CertificateTypeLabel({type}) {
  switch (type) {
    case CertificateType.Beginner:
      return (
        <CertificateTypeLabelLayout bg="red.500">
          Beginner
        </CertificateTypeLabelLayout>
      )
    case CertificateType.Expert:
      return (
        <CertificateTypeLabelLayout bg="gray.500">
          Expert
        </CertificateTypeLabelLayout>
      )
    case CertificateType.Master:
      return (
        <CertificateTypeLabelLayout bg="orange.500">
          Master
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
