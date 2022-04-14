import * as React from 'react'
import {Box, Flex, HStack, Stack, Text} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {PrimaryButton} from '../../shared/components/button'
import {
  PageHeader,
  PageCloseButton,
  PageFooter,
  AdImage,
} from '../../screens/ads/components'
import {useIpfsAd} from '../../screens/ads/hooks'
import {ExternalLink} from '../../shared/components/components'

export default function ViewAdPage() {
  const {t} = useTranslation()

  const router = useRouter()

  const {data} = useIpfsAd(router.query?.cid)

  return (
    <Layout>
      <Page px={0} py={0} overflow="hidden">
        <Flex
          direction="column"
          flex={1}
          w="full"
          px={20}
          py={6}
          overflowY="auto"
        >
          <PageHeader>
            <PageTitle mb={0}>{t('View ad')}</PageTitle>
            <PageCloseButton href="/adn/list" />
          </PageHeader>

          <Flex align="center" flex={1}>
            {data ? (
              <HStack spacing="10" w="4xl">
                <Stack
                  flex={1}
                  alignSelf="stretch"
                  bg="gray.50"
                  rounded="lg"
                  px="10"
                  py="8"
                  maxH="md"
                >
                  <Text fontSize="lg" fontWeight={500}>
                    {data.title}
                  </Text>
                  <Text fontWeight={500}>{data.desc}</Text>
                  <ExternalLink href={data.url}>{data.url}</ExternalLink>
                </Stack>
                <Box flex={1}>
                  <AdImage src={data.media} />
                </Box>
              </HStack>
            ) : null}
          </Flex>
        </Flex>

        <PageFooter>
          <PrimaryButton
            onClick={() => {
              router.push('/adn/list')
            }}
          >
            {t('Close')}
          </PrimaryButton>
        </PageFooter>
      </Page>
    </Layout>
  )
}
