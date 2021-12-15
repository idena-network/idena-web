import {Box, CloseButton, Flex, Heading, Stack} from '@chakra-ui/react'
import dayjs from 'dayjs'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import React from 'react'
import {Page} from '../../screens/app/components'
import {CertificateCard} from '../../screens/try/components'
import {GetNextUTCValidationDate} from '../../screens/try/utils'
import {Avatar} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import {useAuthState} from '../../shared/providers/auth-context'
import {CertificateType} from '../../shared/types'
import {ArrowBackIcon} from '../../shared/components/icons'

export default function Try() {
  const {t} = useTranslation()
  const router = useRouter()
  const {coinbase} = useAuthState()

  return (
    <Layout>
      <Page p={0}>
        <Flex
          direction="column"
          mx={[8, 0]}
          flex={1}
          alignSelf="stretch"
          pb={10}
        >
          <Flex
            align="center"
            alignSelf="stretch"
            justify="space-between"
            pt={[12, 0]}
            my={8}
          >
            <Box
              w="100%"
              h={6}
              position="absolute"
              top="16px"
              left={0}
              display={['block', 'none']}
            >
              <ArrowBackIcon
                fill="blue.500"
                boxSize={6}
                ml={4}
                onClick={() => router.push('/home')}
              ></ArrowBackIcon>
            </Box>
            <Flex
              direction={['column', 'row']}
              align="center"
              width={['100%', '480px']}
            >
              <Avatar address={coinbase} />
              <Stack
                mt={[5, 0]}
                ml={[0, 6]}
                w={['80%', 'auto']}
                textAlign={['center', 'initial']}
                spacing={1}
              >
                <Heading
                  as="h2"
                  fontSize="lg"
                  fontWeight={500}
                  lineHeight="short"
                >
                  {t('Training validation')}
                </Heading>
                <Heading
                  as="h3"
                  fontSize="mdx"
                  fontWeight="normal"
                  color="muted"
                  lineHeight="shorter"
                >
                  {t(
                    'Learn about the validation process and get a certificate. You can provide it as a proof to a validated person to get an invitation code.'
                  )}
                </Heading>
              </Stack>
            </Flex>
            <CloseButton
              display={['none', 'flex']}
              alignSelf="flex-start"
              onClick={() => {
                router.push('/home')
              }}
            />
          </Flex>
          <Stack width={['100%', "480px"]} spacing={5}>
            <CertificateCard
              title={t('Easy')}
              description={t('Pass the training validation immediately.')}
              trustLevel={t('Low')}
              scheduleText={t('Immediately')}
              type={CertificateType.Easy}
              certificateColor="red.500"
            />
            <CertificateCard
              title={t('Medium')}
              description={t(
                'Schedule your next training validation and join exactly on time.'
              )}
              trustLevel={t('Middle')}
              scheduleText={t('In 1 hour')}
              type={CertificateType.Medium}
              certificateColor="gray.500"
            />
            <CertificateCard
              title={t('Hard')}
              description={t(
                'Train your time management skills. Validation requires participants to join exactly on time.'
              )}
              trustLevel={t('High')}
              scheduleText={`${dayjs(GetNextUTCValidationDate()).format(
                'D MMM HH:mm'
              )}`}
              type={CertificateType.Hard}
              certificateColor="orange.500"
            />
          </Stack>
        </Flex>
      </Page>
    </Layout>
  )
}
