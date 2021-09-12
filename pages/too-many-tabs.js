import {Flex, Heading, Image, Stack, Text} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {IconButton} from '../shared/components/button'
import {RefreshIcon} from '../shared/components/icons'

export default function ManyTabs() {
  const router = useRouter()
  const {t} = useTranslation()

  return (
    <Flex
      flexWrap="wrap"
      color="brand.gray"
      bg="gray.100"
      fontSize="md"
      h="100vh"
      flex={1}
      w="100%"
      align="center"
      justify="center"
    >
      <Flex align="center" justify="center" px={20} py={20} bg="white">
        <Stack alignItems="center" spacing={4}>
          <Image
            ignoreFallback
            src="/static/idena-logo-circle.svg"
            alt="logo"
            w={16}
          />
          <Heading fontSize="lg" fontWeight={500} color="gray.500">
            {t('Error, many tabs…')}
          </Heading>
          <Text color="muted" w="320px" textAlign="center">
            {t(
              'Idena supports only one active tab with the app. Please reload this page to continue using this tab or close it.'
            )}
          </Text>
          <IconButton
            onClick={() => router.reload()}
            rightIcon={<RefreshIcon boxSize={5} />}
          >
            {t('Reload page')}
          </IconButton>
        </Stack>
      </Flex>
    </Flex>
  )
}
