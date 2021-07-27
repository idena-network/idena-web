import React from 'react'
import PropTypes from 'prop-types'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {Button, Stack} from '@chakra-ui/react'
import Layout from '../../shared/components/layout'
import {Box, PageTitle} from '../../shared/components'
import theme from '../../shared/theme'

function SettingsLayout({children}) {
  const router = useRouter()
  const {t} = useTranslation()

  return (
    <Layout canRedirect={false}>
      <Box px={theme.spacings.xxxlarge} py={theme.spacings.large}>
        <Box>
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
          </Stack>
        </Box>
        {children}
      </Box>
    </Layout>
  )
}

SettingsLayout.propTypes = {
  children: PropTypes.node,
}

export default SettingsLayout
