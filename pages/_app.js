import React from 'react'
import App from 'next/app'
import Router from 'next/router'
import Head from 'next/head'
import {ThemeProvider, CSSReset} from '@chakra-ui/core'
import NProgress from 'nprogress'
import GoogleFonts from 'next-google-fonts'

import '../i18n'

import {uiTheme} from '../shared/theme'

import {EpochProvider} from '../shared/providers/epoch-context'
import {IdentityProvider} from '../shared/providers/identity-context'
import {NotificationProvider} from '../shared/providers/notification-context'
import {TimingProvider} from '../shared/providers/timing-context'
import {SettingsProvider} from '../shared/providers/settings-context'

// eslint-disable-next-line import/no-extraneous-dependencies
import 'tui-image-editor/dist/tui-image-editor.css'
import {AuthProvider} from '../shared/providers/auth-context'
import Flips from '../shared/components/flips'

export default class MyApp extends App {
  render() {
    const {Component, pageProps} = this.props

    // Workaround for https://github.com/zeit/next.js/issues/8592
    const {err} = this.props

    return (
      <>
        <GoogleFonts href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" />
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
          <link href="/static/fonts/icons.css" rel="stylesheet" />
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
        <ThemeProvider theme={uiTheme}>
          <CSSReset />
          <AppProviders>
            <Component {...{...pageProps, err}} />
          </AppProviders>
        </ThemeProvider>
      </>
    )
  }
}

function AppProviders(props) {
  return (
    <SettingsProvider>
      <AuthProvider>
        <TimingProvider>
          <EpochProvider>
            <IdentityProvider>
              <Flips />
              <NotificationProvider {...props} />
            </IdentityProvider>
          </EpochProvider>
        </TimingProvider>
      </AuthProvider>
    </SettingsProvider>
  )
}

Router.events.on('routeChangeStart', NProgress.start)
Router.events.on('routeChangeComplete', NProgress.done)
Router.events.on('routeChangeError', NProgress.done)
