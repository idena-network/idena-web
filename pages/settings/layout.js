import React from 'react'
import PropTypes from 'prop-types'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {Box, Button, Stack} from '@chakra-ui/react'
import Layout from '../../shared/components/layout'
import {Page, PageTitle} from '../../screens/app/components'

function SettingsLayout({children}) {
  const router = useRouter()
  const {t} = useTranslation()

  return (
    <Layout canRedirect={false}>
      <Page alignItems="normal">
        <Box display={['none', 'block']}>
          <PageTitle>{t('Settings')}</PageTitle>
          <Stack spacing={2} isInline>
            <Button
              variant="tab"
              onClick={() => router.push('/settings')}
              isActive={router.pathname === '/settings'}
            >
              {t('General')}
            </Button>
            <Button
              variant="tab"
              onClick={() => router.push('/settings/node')}
              isActive={router.pathname === '/settings/node'}
            >
              {t('Node')}
            </Button>
            <Button
              variant="tab"
              onClick={() => router.push('/settings/affiliate')}
              isActive={router.pathname === '/settings/affiliate'}
            >
              {t('Affiliate program')}
            </Button>
          </Stack>
        </Box>
        {children}
      </Page>
    </Layout>
  )
}

SettingsLayout.propTypes = {
  children: PropTypes.node,
}

export default SettingsLayout
