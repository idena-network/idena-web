import {Box, Button, CloseButton, Flex, Heading, Stack} from '@chakra-ui/react'
import dayjs from 'dayjs'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {Page} from '../../screens/app/components'
import {CertificateCard} from '../../screens/try/components'
import {GetNextUTCValidationDate} from '../../screens/try/utils'
import {Avatar, MobileApiStatus} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import {useAuthState} from '../../shared/providers/auth-context'
import {useTestValidationDispatch} from '../../shared/providers/test-validation-context'
import {CertificateType} from '../../shared/types'

export default function Try() {
  const {t} = useTranslation()
  const router = useRouter()
  const {coinbase} = useAuthState()

  const {scheduleValidation} = useTestValidationDispatch()

  return (
    <Layout>
      <Page pt={[4, 0]}>
        <MobileApiStatus display={['initial', 'none']} left={4} />
        <Flex
          direction="column"
          flex={1}
          alignSelf="stretch"
          pb={[6, 10]}
          pt={[2, 0]}
        >
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
                <Box>
                  <Button
                    variant="link"
                    color="blue.500"
                    w="auto"
                    onClick={() => scheduleValidation(CertificateType.Sample)}
                  >{`${t('Learn to solve flips')} >`}</Button>
                </Box>
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
              display={['none', 'initial']}
              alignSelf="flex-start"
              onClick={() => {
                router.push('/home')
              }}
            />
          </Flex>
          <Stack width={['100%', '480px']} spacing={5}>
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
