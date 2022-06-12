import {useRouter} from 'next/router'
import React from 'react'

export function useHamburgerTop({hasRotatingAds, didConnectIdenaBot}) {
  const {asPath} = useRouter()

  return React.useMemo(() => {
    const isHomePage = asPath.startsWith('/home')
    const isAdOffersPage = asPath.startsWith('/adn/offers')

    if (isAdOffersPage) {
      return '4'
    }

    if (!didConnectIdenaBot && isHomePage) {
      return '36'
    }

    return hasRotatingAds ? '72px' : '24'
  }, [asPath, didConnectIdenaBot, hasRotatingAds])
}
