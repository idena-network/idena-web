import {useRouter} from 'next/router'
import * as React from 'react'
import {areSameCaseInsensitive} from '../../shared/utils/utils'
import {
  dnaLinkMethod,
  extractQueryParams,
  isValidDnaUrl,
  resolveDnaAppUrl,
} from './utils'

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
    const currentUrl = window.location.href

    setMethod(dnaLinkMethod(currentUrl))

    const {
      callback_url: callbackUrl,
      callback_format: callbackFormat,
      ...dnaQueryParams
    } = extractQueryParams(currentUrl)

    setParams({
      ...dnaQueryParams,
      callbackUrl,
      callbackFormat,
    })
  }, [router])

  return {
    url: typeof window === 'undefined' ? null : window.location.href,
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
  const router = useRouter()

  const [dnaUrl, setDnaUrl] = React.useState()

  React.useEffect(() => {
    const {route, query} = router
    if (isValidDnaUrl(route)) setDnaUrl(resolveDnaAppUrl({route, query}))
  }, [router])

  React.useEffect(() => {
    if (dnaUrl) {
      const {route, query} = router
      sessionStorage.setItem('dnaUrl', JSON.stringify({route, query}))
    } else if (dnaUrl === null) {
      sessionStorage.removeItem('dnaUrl')
    }
  }, [dnaUrl, router])

  return [
    dnaUrl,
    {
      clear() {
        setDnaUrl(null)
      },
      dismiss() {
        setDnaUrl(null)
        router.push('/home')
      },
    },
  ]
}
