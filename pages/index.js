import {useRouter} from 'next/router'
import {useEffect} from 'react'
import Layout from '../shared/components/layout'
import {useAuthState} from '../shared/providers/auth-context'

export default function Index() {
  const router = useRouter()
  const {auth} = useAuthState()

  useEffect(() => {
    if (auth) {
      router.push('/home')
    }
  }, [auth, router])

  return <Layout canRedirect={false}></Layout>
}
