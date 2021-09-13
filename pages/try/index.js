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
              description={t('Pass the training validation immediately.')}
              trustLevel={t('Low')}
              scheduleText={t('Immediately')}
              type={CertificateType.Beginner}
              certificateColor="red.500"
            />
            <CertificateCard
              title={t('Expert')}
              description={t(
                'Schedule your next training validation and join exactly on time.'
              )}
              trustLevel={t('Middle')}
              scheduleText={t('In 1 hour')}
              type={CertificateType.Expert}
              certificateColor="gray.500"
            />
            <CertificateCard
              title={t('Master')}
              description={t(
                'Train your time management skills. Validation requires participants to join exactly on time.'
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
