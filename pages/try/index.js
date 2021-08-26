import {CloseButton, Flex, Heading, Stack} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {Page} from '../../screens/app/components'
import {CertificateCard} from '../../screens/try/components'
import {Avatar} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import {useAuthState} from '../../shared/providers/auth-context'
import {useTestValidationState} from '../../shared/providers/test-validation-context'
import {CertificateType} from '../../shared/types'

export default function Try() {
  const {t} = useTranslation()
  const router = useRouter()
  const {coinbase} = useAuthState()

  const testValidationState = useTestValidationState()

  return (
    <Layout>
      <Page p={0}>
        <Flex
          direction="column"
          flex={1}
          alignSelf="stretch"
          px={20}
          pb="36px"
          overflowY="auto"
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
          <Stack width="480px">
            <CertificateCard
              title={t('Beginner')}
              description={t(
                'Try to pass the validation ceremony immediately.'
              )}
              id={testValidationState.validations[CertificateType.Beginner].id}
              type={CertificateType.Beginner}
              actionType={
                testValidationState.validations[CertificateType.Beginner]
                  .actionType
              }
            />
          </Stack>
        </Flex>
      </Page>
    </Layout>
  )
}
