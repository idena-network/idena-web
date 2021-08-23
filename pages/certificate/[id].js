import {Box, Divider, Flex, Heading, Image, Stack} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useEffect} from 'react'
import {useQuery} from 'react-query'
import {CertificateTypeLabel} from '../../screens/certificate/components'
import {fetchIdentity} from '../../shared/api'
import {getCertificate} from '../../shared/api/self'
import {Avatar, Skeleton} from '../../shared/components/components'
import {TelegramIcon} from '../../shared/components/icons'
import {mapIdentityToFriendlyStatus, toPercent} from '../../shared/utils/utils'

export default function Certificate() {
  const router = useRouter()
  const {id} = router.query

  const {data, isLoading: certificateIsLoading, isError} = useQuery(
    ['get-certificate', id],
    () => getCertificate(id),
    {
      enabled: !!id,
      retry: false,
      refetchOnWindowFocus: false,
    }
  )

  const {data: identity, isLoading: identityIsLoading} = useQuery(
    ['fetch-identity', data?.coinbase],
    () => fetchIdentity(data.coinbase, true),
    {
      enabled: !!data?.coinbase,
      retry: false,
      refetchOnWindowFocus: false,
    }
  )

  const isLoading = certificateIsLoading || identityIsLoading

  useEffect(() => {
    if (isError) router.push('/')
  }, [isError, router])

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
        <CertificateTypeLabel type={isLoading ? null : data?.type} />
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
              <Box>
                {isLoading ? (
                  <Skeleton w={10} h={4} />
                ) : (
                  data && toPercent(data.shortScore)
                )}
              </Box>
            </Flex>
            <Flex justifyContent="space-between">
              <Box>Long session score</Box>
              <Box>
                {isLoading ? (
                  <Skeleton w={10} h={4} />
                ) : (
                  data && toPercent(data.longScore)
                )}
              </Box>
            </Flex>
            <Flex justifyContent="space-between">
              <Box>Reporting score</Box>
              <Box>
                {isLoading ? (
                  <Skeleton w={10} h={4} />
                ) : (
                  data && toPercent(data.reportScore)
                )}
              </Box>
            </Flex>
          </Stack>
          {isLoading ? (
            <Skeleton w={240} h={8} />
          ) : (
            <Stack isInline spacing={3} align="center" w={240}>
              <Avatar size={8} address={data?.coinbase} />
              <Stack spacing={0} overflow="hidden" w="100%">
                <Heading fontSize="md" fontWeight={500}>
                  {mapIdentityToFriendlyStatus(identity?.state)}
                </Heading>
                <Heading
                  fontSize="sm"
                  textOverflow="ellipsis"
                  overflow="hidden"
                  whiteSpace="nowrap"
                  fontWeight={500}
                  color="muted"
                  lineHeight="shorter"
                >
                  {data?.coinbase}
                </Heading>
              </Stack>
            </Stack>
          )}
          <Divider></Divider>
        </Stack>
        <Flex
          mt={82}
          justifyContent="space-between"
          w="100%"
          alignItems="center"
        >
          <Box fontSize="md" color="muted" lineHeight={4}>
            {isLoading ? (
              <Skeleton w={20} h={4} />
            ) : (
              new Date(data?.timestamp).toLocaleDateString()
            )}
          </Box>
          <Flex>
            <TelegramIcon boxSize={4}></TelegramIcon>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}
