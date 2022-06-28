import {useRouter} from 'next/router'
import React from 'react'

export function useHamburgerTop({didConnectIdenaBot}) {
  const {asPath} = useRouter()

  return React.useMemo(
    () => (didConnectIdenaBot || !asPath.startsWith('/home') ? '4' : '20'),
    [asPath, didConnectIdenaBot]
  )
}
