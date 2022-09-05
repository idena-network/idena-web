import React, {useEffect, useRef} from 'react'
import {useRouter} from 'next/router'
import Head from 'next/head'
import {QueryClient, QueryClientProvider} from 'react-query'
import ReactGA from 'react-ga'
import {v4 as uuidv4} from 'uuid'
import TagManager from 'react-gtm-module'

import '../i18n'
import 'focus-visible/dist/focus-visible'

import {Box, ChakraProvider, extendTheme} from '@chakra-ui/react'
import {uiTheme} from '../shared/theme'

// eslint-disable-next-line import/no-extraneous-dependencies
import 'tui-image-editor/dist/tui-image-editor.css'

import {SettingsProvider} from '../shared/providers/settings-context'
import {AuthProvider} from '../shared/providers/auth-context'
import Flips from '../shared/components/flips'
import {AppProvider} from '../shared/providers/app-context'
import {IdentityProvider} from '../shared/providers/identity-context'
import {EpochProvider} from '../shared/providers/epoch-context'
import {OnboardingProvider} from '../shared/providers/onboarding-context'
import {TestValidationProvider} from '../shared/providers/test-validation-context'

// Workaround for https://github.com/zeit/next.js/issues/8592
export default function MyApp({Component, pageProps, err}) {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <title>Idena app: Proof-of-person blockchain</title>
        <meta httpEquiv="X-UA-Compatible" content="chrome=1" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no"
        />
        <meta
          name="description"
          content="Take part in the Idena validation ceremony using your browser"
        />

        <link rel="shortcut icon" href="/favicon.ico" />

        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />

        <style data-href="https://fonts.googleapis.com/css2?family=Inter">
          {`/* cyrillic-ext */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 400;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2JL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
            }
            /* cyrillic */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 400;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa0ZL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
            }
            /* greek-ext */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 400;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2ZL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+1F00-1FFF;
            }
            /* greek */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 400;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1pL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0370-03FF;
            }
            /* vietnamese */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 400;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2pL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB;
            }
            /* latin-ext */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 400;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa25L7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;
            }
            /* latin */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 400;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2) format('woff2');
              unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
            }
            /* cyrillic-ext */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 500;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2JL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
            }
            /* cyrillic */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 500;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa0ZL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
            }
            /* greek-ext */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 500;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2ZL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+1F00-1FFF;
            }
            /* greek */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 500;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1pL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0370-03FF;
            }
            /* vietnamese */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 500;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2pL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB;
            }
            /* latin-ext */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 500;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa25L7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;
            }
            /* latin */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 500;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2) format('woff2');
              unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
            }
            /* cyrillic-ext */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 600;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2JL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
            }
            /* cyrillic */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 600;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa0ZL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
            }
            /* greek-ext */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 600;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2ZL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+1F00-1FFF;
            }
            /* greek */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 600;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1pL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0370-03FF;
            }
            /* vietnamese */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 600;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2pL7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB;
            }
            /* latin-ext */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 600;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa25L7W0Q5n-wU.woff2) format('woff2');
              unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;
            }
            /* latin */
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 600;
              font-display: swap;
              src: url(https://fonts.gstatic.com/s/inter/v11/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2) format('woff2');
              unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
            }`}
        </style>

        <link href="/static/fonts/icons.css" rel="stylesheet" />
        <link href="/static/scrollbars.css" rel="stylesheet" />
        <style>{`
            html {
              -moz-osx-font-smoothing: grayscale;
            }
          `}</style>
        <script
          type="text/javascript"
          src="https://apis.google.com/js/api.js"
        ></script>
      </Head>
      <ChakraProvider theme={extendTheme(uiTheme)}>
        <IdenaApp>
          <Component {...{...pageProps, err}} />
        </IdenaApp>
      </ChakraProvider>
    </>
  )
}

// Create a client
const queryClient = new QueryClient()

// eslint-disable-next-line react/prop-types
function AppProviders({tabId, ...props}) {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AuthProvider>
          <TestValidationProvider>
            <EpochProvider>
              <IdentityProvider>
                <AppProvider tabId={tabId}>
                  <Flips />
                  <OnboardingProvider {...props} />
                </AppProvider>
              </IdentityProvider>
            </EpochProvider>
          </TestValidationProvider>
        </AuthProvider>
      </SettingsProvider>
    </QueryClientProvider>
  )
}

function IdenaApp(props) {
  const router = useRouter()

  const id = useRef(uuidv4())

  useEffect(() => {
    ReactGA.initialize('UA-139651161-3')
    ReactGA.pageview(window.location.pathname + window.location.search)
  }, [])

  useEffect(() => {
    TagManager.initialize({gtmId: 'GTM-P4K5GX4'})
  }, [])

  useEffect(() => {
    const handleRouteChange = url => {
      ReactGA.pageview(url)
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  return ['/certificate/[id]', '/too-many-tabs'].includes(router.pathname) ? (
    <QueryClientProvider client={queryClient}>
      <Box {...props} />
    </QueryClientProvider>
  ) : (
    <AppProviders tabId={id.current} {...props} />
  )
}
