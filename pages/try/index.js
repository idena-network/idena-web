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
import {useIsDesktop} from '../../shared/utils/utils'

export default function Try() {
  const {t} = useTranslation()
  const router = useRouter()
  const {coinbase} = useAuthState()

  const {scheduleValidation} = useTestValidationDispatch()

  const isDesktop = useIsDesktop()

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
              {isDesktop && <Avatar address={coinbase} />}
              <Stack spacing={1} mt={[2, 0]}>
                <Heading
                  as="h2"
                  fontSize={['20px', 'lg']}
                  fontWeight={[600, 500]}
                  lineHeight="short"
                >
                  {t('Training validation certificates')}
                </Heading>
                <Box order={[3, 2]} pt={[2, 0]}>
                  <Button
                    variant="link"
                    color="blue.500"
                    w="auto"
                    fontSize={['16px', 'md']}
                    onClick={() => scheduleValidation(CertificateType.Sample)}
                  >{`${t('Learn how to solve flips')} >`}</Button>
                </Box>
                <Heading
                  order={[2, 3]}
                  as="h3"
                  fontSize="mdx"
                  fontWeight="normal"
                  color="muted"
                  lineHeight="shorter"
                >
                  {t(
                    'Pass the training validation and get your certificate. Share the certificate with validated participants of the Idena community to get an invitation code.'
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
