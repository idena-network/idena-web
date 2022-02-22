import {Box, Stack, Text} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {InlineAdStat, AdCoverImage} from '../../screens/ads/containers'
import {useAd} from '../../screens/ads/hooks'
import {Page, PageTitle} from '../../screens/app/components'
import {ExternalLink, HDivider} from '../../shared/components/components'
import Layout from '../../shared/components/layout'
import {toLocaleDna} from '../../shared/utils/utils'

export default function AdViewPage() {
  const {t, i18n} = useTranslation()

  const {query} = useRouter()

  const ad = useAd(query.id)

  return (
    <Layout>
      <Page as={Stack} spacing={4}>
        <PageTitle>{t('View ad')}</PageTitle>
        <Stack spacing={6} bg="gray.50" p={6} rounded="lg" w="full">
          <Stack isInline spacing={5}>
            <AdCoverImage ad={ad} w="16" />
            <Box>
              <Text fontWeight={500}>{ad.title}</Text>
              <ExternalLink href={ad.url}>{ad.url}</ExternalLink>
            </Box>
          </Stack>
          <Stack spacing={3}>
            <HDivider />
            <Stack>
              <InlineAdStat label="Language" value={ad.language || '♾'} />
              <InlineAdStat label="Stake" value={ad.stake} />
              <InlineAdStat label="Age" value={ad.age} />
              <InlineAdStat label="OS" value={ad.os || '♾'} />
            </Stack>
            <HDivider />
            <Stack>
              <InlineAdStat label="Competitors" value={Number(0)} />
              <InlineAdStat
                label="Max price"
                value={toLocaleDna(i18n.language)(0)}
              />
            </Stack>
          </Stack>
        </Stack>
      </Page>
    </Layout>
  )
}
