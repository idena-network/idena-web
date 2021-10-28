import {useRouter} from 'next/router'
import {useEffect} from 'react'
import Layout from '../shared/components/layout'
import {useSettingsState} from '../shared/providers/settings-context'

export default function Index() {
  const router = useRouter()
  const {encryptedKey, coinbase} = useSettingsState()

  useEffect(() => {
    if (encryptedKey && coinbase) {
      router.push('/home')
    }
  }, [encryptedKey, coinbase, router])

  return <Layout canRedirect={false}></Layout>
}
