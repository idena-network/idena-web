import {CloseButton, Flex, Heading, Stack} from '@chakra-ui/react'
import dayjs from 'dayjs'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {Page} from '../../screens/app/components'
import {CertificateCard} from '../../screens/try/components'
import {GetNextUTCValidationDate} from '../../screens/try/utils'
import {Avatar} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import {useAuthState} from '../../shared/providers/auth-context'
import {CertificateType} from '../../shared/types'

export default function Try() {
  const {t} = useTranslation()
  const router = useRouter()
  const {coinbase} = useAuthState()

  return (
    <Layout>
      <Page p={0}>
        <Flex direction="column" flex={1} alignSelf="stretch" pb={10}>
          <Flex
            align="center"
            alignSelf="stretch"
            justify="space-between"
            my={8}
          >
            <Stack isInline spacing={6} align="center" width="480px">
              <Avatar address={coinbase} />
              <Stack spacing={1}>
                <Heading
                  as="h2"
                  fontSize="lg"
                  fontWeight={500}
                  lineHeight="short"
                >
                  {t('Test validation')}
                </Heading>
                <Heading
                  as="h3"
                  fontSize="mdx"
                  fontWeight="normal"
                  color="muted"
                  lineHeight="shorter"
                >
                  {t(
                    'Complete the training and get a certificate. It will help you to get an invite code. Better to start with a Beginner.'
                  )}
                </Heading>
              </Stack>
            </Stack>
            <CloseButton
              alignSelf="flex-start"
              onClick={() => {
                router.push('/')
              }}
            />
          </Flex>
          <Stack width="480px" spacing={5}>
            <CertificateCard
              title={t('Beginner')}
              description={t(
                'Try to pass the validation ceremony immediately.'
              )}
              trustLevel={t('Low')}
              scheduleText={t('Immediately')}
              type={CertificateType.Beginner}
              certificateColor="red.500"
            />
            <CertificateCard
              title={t('Expert')}
              description={t(
                'Schedule your next validation ceremony and join exactly on time.'
              )}
              trustLevel={t('Middle')}
              scheduleText={t('In 1 hour')}
              type={CertificateType.Expert}
              certificateColor="gray.500"
            />
            <CertificateCard
              title={t('Master')}
              description={t(
                'Plan your validation in advance and join on certain time universal for all network participants.'
              )}
              trustLevel={t('High')}
              scheduleText={`${dayjs(GetNextUTCValidationDate()).format(
                'D MMM HH:mm'
              )}`}
              type={CertificateType.Master}
              certificateColor="orange.500"
            />
          </Stack>
        </Flex>
      </Page>
    </Layout>
  )
}
