import * as React from 'react'
import {useRouter} from 'next/router'

export function useDnaUrl() {
  const {route, query} = useRouter()

  const isDnaUrl = route.startsWith('/dna/')

  React.useEffect(() => {
    if (isDnaUrl)
      sessionStorage.setItem('dnaUrl', JSON.stringify({route, query}))
  }, [isDnaUrl, query, route])

  return isDnaUrl ? resolveDnaAppUrl({route, query}) : null
}

function resolveDnaAppUrl({route, query}) {
  const method = route.substring(route.indexOf('/dna/') + 5)

  const params = Object.entries(query)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  return `dna://${method}/v1?${params}`
}
