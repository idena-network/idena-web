import React from 'react'
import PropTypes from 'prop-types'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {Box, Flex, Button, Stack, useBreakpointValue} from '@chakra-ui/react'
import Layout from '../../shared/components/layout'
import {Page, PageTitle} from '../../screens/app/components'

function SettingsLayout({children}) {
  const router = useRouter()
  const {t} = useTranslation()
  const variant = useBreakpointValue(['tabMobile', 'tab'])

  return (
    <Layout canRedirect={false}>
      <Page>
        <Flex
          direction="column"
          align={['center', 'flex-start']}
          w={['100%', 'auto']}
        >
          <PageTitle fontSize={['base', 'xl']} fontWeight={[600, 500]}>
            {t('Settings')}
          </PageTitle>
          <Flex
            align={['center', 'flex-start']}
            justify={['space-between', 'initital']}
            background={['gray.50', 'transparent']}
            borderRadius={['8px', 0]}
            p={['3px', 0]}
            w={['100%', 'auto']}
          >
            <Button
              variant={variant}
              onClick={() => router.push('/settings')}
              isActive={router.pathname === '/settings'}
            >
              {t('General')}
            </Button>
            <Button
              ml={[0, 2]}
              variant={variant}
              onClick={() => router.push('/settings/node')}
              isActive={router.pathname === '/settings/node'}
            >
              {t('Node')}
            </Button>
          </Flex>
        </Flex>
        {children}
      </Page>
    </Layout>
  )
}

SettingsLayout.propTypes = {
  children: PropTypes.node,
}

export default SettingsLayout
