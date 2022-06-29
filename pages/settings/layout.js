import React from 'react'
import PropTypes from 'prop-types'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {Box, Button, Stack} from '@chakra-ui/react'
import Layout from '../../shared/components/layout'
import {Page, PageTitleNew} from '../../screens/app/components'
import {AngleArrowBackIcon} from '../../shared/components/icons'
import {MobileApiStatus} from '../../shared/components/components'

function SettingsLayout({title, children}) {
  const router = useRouter()
  const {t} = useTranslation()

  return (
    <Layout canRedirect={false}>
      <Page alignItems="normal">
        <Box position="relative">
          {router.pathname.match(/\/settings\/(.)+/) ? (
            <AngleArrowBackIcon
              display={['block', 'none']}
              stroke="#578FFF"
              position="absolute"
              left={-4}
              top={-2}
              h="28px"
              w="28px"
              onClick={() => {
                router.push('/settings')
              }}
            />
          ) : (
            <MobileApiStatus top={-2} left={-4} />
          )}
          <PageTitleNew mt={-2}>{title}</PageTitleNew>
          <Stack spacing={2} isInline display={['none', 'block']}>
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
