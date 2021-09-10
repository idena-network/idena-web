/* eslint-disable react/prop-types */
import {Box, Divider, Flex, Heading, Image, Stack} from '@chakra-ui/react'
import {useQuery} from 'react-query'
import {CertificateTypeLabel} from '../../screens/certificate/components'
import {fetchIdentity} from '../../shared/api'
import {Avatar, Skeleton} from '../../shared/components/components'
import {TelegramIcon} from '../../shared/components/icons'
import {CertificateActionType} from '../../shared/types'
import {mapIdentityToFriendlyStatus, toPercent} from '../../shared/utils/utils'
import {getCertificateData} from '../api/validation/certificate'

export default function Certificate({certificate}) {
  const {data: identity, isLoading: identityIsLoading} = useQuery(
    ['fetch-identity', certificate.coinbase],
    () => fetchIdentity(certificate.coinbase, true),
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  )

  return (
    <Flex
      background="rgba(17, 17, 17, 0.8)"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flex={1}
      height="100vh"
    >
      <Flex
        borderRadius="md"
        backgroundColor="white"
        justifyContent="center"
        px={10}
        py={8}
        direction="column"
        overflow="hidden"
        position="relative"
      >
        <CertificateTypeLabel type={certificate.type} />
        <Stack spacing={8} alignItems="center" px={10}>
          <Image ignoreFallback src="/static/idena-logo-round.svg" h={16} />
          <Heading fontSize="lg" fontWeight="500">
            Certificate
          </Heading>
          <Stack
            spacing={3 / 2}
            bg="gray.50"
            px={6}
            py={4}
            rounded="lg"
            fontSize="sm"
            w={240}
          >
            <Flex justifyContent="space-between">
              <Box>Short session score</Box>
              <Box>{toPercent(certificate.shortScore / 6)}</Box>
            </Flex>
            <Flex justifyContent="space-between">
              <Box>Long session score</Box>
              <Box>{toPercent(certificate.longScore / 18)}</Box>
            </Flex>
            <Flex justifyContent="space-between">
              <Box>Reporting score</Box>
              <Box>{toPercent(certificate.reportScore / 6)}</Box>
            </Flex>
          </Stack>

          <Stack isInline spacing={3} align="center" w={240}>
            <Avatar size={8} address={certificate.coinbase} />

            <Stack spacing={0} overflow="hidden" w="100%">
              {identityIsLoading ? (
                <Skeleton h={4} w={20}></Skeleton>
              ) : (
                <Heading fontSize="md" fontWeight={500} lineHeight={4}>
                  {mapIdentityToFriendlyStatus(identity?.state || 'Undefined')}
                </Heading>
              )}
              <Heading
                fontSize="sm"
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
                fontWeight={500}
                color="muted"
                lineHeight="shorter"
              >
                {certificate.coinbase}
              </Heading>
            </Stack>
          </Stack>

          <Divider></Divider>
        </Stack>
        <Flex
          mt={82}
          justifyContent="space-between"
          w="100%"
          alignItems="center"
        >
          <Box fontSize="md" color="muted" lineHeight={4}>
            {new Date(certificate.timestamp).toLocaleDateString()}
          </Box>
          <Flex>
            <TelegramIcon boxSize={4}></TelegramIcon>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}

export async function getServerSideProps({params}) {
  try {
    const certificate = await getCertificateData(params.id)
    if (!certificate.active) {
      throw new Error('ceriticate is expired')
    }
    if (certificate.actionType !== CertificateActionType.Passed) {
      throw new Error('bad certificate')
    }
    return {
      props: {
        certificate,
      },
    }
  } catch {
    return {
      notFound: true,
    }
  }
}
