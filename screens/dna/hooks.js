import {useRouter} from 'next/router'
import * as React from 'react'
import {areSameCaseInsensitive} from '../../shared/utils/utils'
import {dnaLinkMethod, extractQueryParams, resolveDnaAppUrl} from './utils'

export const DnaLinkMethod = {
  SignIn: 'signin',
  Send: 'send',
  RawTx: 'raw',
  Vote: 'vote',
  Invite: 'invite',
}

export function useDnaLink() {
  const router = useRouter()

  const [method, setMethod] = React.useState()

  const [params, setParams] = React.useState({})

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    setMethod(dnaLinkMethod(window.location.href))

    const {
      callback_url: callbackUrl,
      callback_format: callbackFormat,
      ...dnaQueryParams
    } = extractQueryParams(window.location.href)

    setParams({
      ...dnaQueryParams,
      callbackUrl,
      callbackFormat,
    })
  }, [router])

  return {
    url: typeof window === 'undefined' ? null : window?.location.href,
    method,
    params,
  }
}

export function useDnaLinkMethod(method, {onReceive}) {
  const dnaLink = useDnaLink()
  const {url, method: currentMethod} = dnaLink

  React.useEffect(() => {
    if (currentMethod === method) {
      if (onReceive) onReceive(url)
    }
  }, [currentMethod, method, onReceive, url])

  return dnaLink
}

export function useDnaLinkRedirect(method, url) {
  const router = useRouter()

  const {params} = useDnaLinkMethod(method, {
    onReceive: () => {
      const targetUrl = typeof url === 'function' ? url(params) : url
      if (!areSameCaseInsensitive(router.asPath, targetUrl)) {
        router.push(targetUrl)
      }
    },
  })
}

export function useDnaAppLink() {
  const {route, query, push: redirect} = useRouter()

  const isDnaUrl = route.startsWith('/dna/')

  React.useEffect(() => {
    if (isDnaUrl)
      sessionStorage.setItem('dnaUrl', JSON.stringify({route, query}))
  }, [isDnaUrl, query, route])

  return [
    isDnaUrl ? resolveDnaAppUrl({route, query}) : null,
    {
      clear() {
        sessionStorage.removeItem('dnaUrl')
        redirect('/home')
      },
    },
  ]
}
