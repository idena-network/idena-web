/* eslint-disable react/prop-types */
import {
  Box,
  Divider,
  Flex,
  Heading,
  Icon,
  Image,
  Link,
  Stack,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import {useRef} from 'react'
import {useTranslation} from 'react-i18next'
import {MdMoreVert} from 'react-icons/md'
import {useQuery} from 'react-query'
import {
  CertificateTypeLabel,
  CertificateTypeTitle,
} from '../../screens/certificate/components'
import {fetchIdentity} from '../../shared/api'
import {IconButton} from '../../shared/components/button'
import {Avatar, Skeleton} from '../../shared/components/components'
import {AddUserIcon, TelegramIcon} from '../../shared/components/icons'
import useClickOutside from '../../shared/hooks/use-click-outside'
import {CertificateActionType, IdentityStatus} from '../../shared/types'
import {
  mapIdentityToFriendlyStatus,
  openExternalUrl,
  toPercent,
} from '../../shared/utils/utils'
import {getCertificateData} from '../api/validation/certificate'

export default function Certificate({id, certificate}) {
  const {
    isOpen: isMenuOpen,
    onOpen: onMenuOpen,
    onClose: onMenuClose,
  } = useDisclosure()

  const {t} = useTranslation()

  const menuRef = useRef()

  useClickOutside(menuRef, () => {
    onMenuClose()
  })

  const {data: identity, isLoading: identityIsLoading, isFetched} = useQuery(
    ['fetch-identity', certificate.coinbase],
    () => fetchIdentity(certificate.coinbase, true),
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  )

  const identityState = identity?.state || IdentityStatus.Undefined

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
        <Flex direction="column" alignItems="center" px={5}>
          <Image ignoreFallback src="/static/idena-logo-round.svg" h={16} />
          <Heading fontSize="lg" fontWeight="500" mt="45px">
            {t('Certificate')}
          </Heading>
          <Text color="muted" fontSize="md" mt={2}>
            {t('Training validation is passed successfully')}
          </Text>
          <Stack
            mt={7}
            spacing={3 / 2}
            bg="gray.50"
            px={6}
            py={4}
            rounded="lg"
            fontSize="sm"
            w={280}
          >
            <Flex justifyContent="space-between">
              <Box> {t('Short session score')}</Box>
              <Box>{toPercent(certificate.shortScore / 6)}</Box>
            </Flex>
            <Flex justifyContent="space-between">
              <Box> {t('Long session score')}</Box>
              <Box>{toPercent(certificate.longScore / 18)}</Box>
            </Flex>
            <Flex justifyContent="space-between">
              <Box> {t('Reporting score')}</Box>
              <Box>{toPercent(certificate.reportScore / 6)}</Box>
            </Flex>
          </Stack>

          <Stack isInline spacing={3} align="center" w={280} mt={8}>
            <Avatar size={8} address={certificate.coinbase} />

            <Stack spacing={0} overflow="hidden" w="100%">
              {identityIsLoading ? (
                <Skeleton h={4} w={20}></Skeleton>
              ) : (
                <Heading fontSize="md" fontWeight={500} lineHeight={4}>
                  {mapIdentityToFriendlyStatus(identityState)}
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
            {isFetched && identityState === IdentityStatus.Undefined && (
              <Flex position="relative">
                <Icon
                  as={MdMoreVert}
                  cursor="pointer"
                  boxSize={5}
                  onClick={onMenuOpen}
                />
                <Flex
                  position="absolute"
                  borderRadius="lg"
                  py={2}
                  boxShadow="0 4px 6px 0 rgba(83, 86, 92, 0.24), 0 0 2px 0 rgba(83, 86, 92, 0.2)"
                  right={0}
                  top={6}
                  zIndex={100}
                  bg="white"
                  display={isMenuOpen ? 'flex' : 'none'}
                  ref={menuRef}
                >
                  <IconButton
                    w="100%"
                    color="brandGray.080"
                    icon={<AddUserIcon color="blue.500" boxSize={5} />}
                    _hover={{bg: 'gray.50'}}
                    _active={{bg: 'gray.50'}}
                    onClick={() => {
                      onMenuClose()
                      openExternalUrl(
                        `https://app.idena.io/dna/invite?address=${certificate.coinbase}`
                      )
                    }}
                  >
                    {t('Send invite')}
                  </IconButton>
                </Flex>
              </Flex>
            )}
          </Stack>

          <Divider mt={7}></Divider>
        </Flex>
        <Flex
          mt={16}
          justifyContent="space-between"
          w="100%"
          alignItems="center"
        >
          <Box fontSize="md" color="muted" lineHeight={4}>
            {new Date(certificate.timestamp).toLocaleDateString()}
          </Box>
          <Flex>
            <Link
              target="_blank"
              href={`https://telegram.me/share/url?url=${encodeURIComponent(
                `https://app.idena.io/certificate/${id}`
              )}&text=${encodeURIComponent(
                `I am looking for an invitation code to join Idena. Please find my ${CertificateTypeTitle(
                  certificate.type
                ).toUpperCase()} training validation certificate in the link attached.`
              )}`}
              _hover={{color: 'blue.500'}}
            >
              <TelegramIcon boxSize={5} />
            </Link>
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
        id: params.id,
      },
    }
  } catch {
    return {
      notFound: true,
    }
  }
}
