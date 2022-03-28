import {Flex, Text, Image, Stack, Link} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import React from 'react'
import {Trans, useTranslation} from 'react-i18next'
import {PrimaryButton} from '../shared/components/button'

export default function Custom404() {
  const router = useRouter()
  const {t} = useTranslation()
  return (
    <Flex h="100vh" direction="column">
      <Flex flexGrow={1} align="center" justify="center" direction="column">
        <Stack spacing="60px">
          <Image ignoreFallback src="/static/idena-logo-circle.svg" h={16} />
          <Image ignoreFallback src="/static/404.jpg" h="180px" />
          <Flex
            fontSize="lg"
            color="gray.500"
            fontWeight="500"
            align="center"
            direction="column"
          >
            <Text>{t('The screen you were looking for doesn’t exist.')}</Text>
            <Text>{t('Return to homepage or explore')}</Text>
          </Flex>
        </Stack>

        <PrimaryButton mt={7} onClick={() => router.push('/home')}>
          {t('Back to My Idena')}
        </PrimaryButton>
      </Flex>
      <Flex justify="center" mb="45px">
        <Trans i18nKey="notFoundContactUs" t={t}>
          <Text color="muted" fontSize="md">
            If you have troubles, please{' '}
            <Link href="mailto:info@idena.io" color="blue.500">
              contact us
            </Link>
          </Text>
        </Trans>
      </Flex>
    </Flex>
  )
}
