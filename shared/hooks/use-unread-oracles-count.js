import {useRouter} from 'next/router'
import {useEffect, useState} from 'react'
import {useQuery} from 'react-query'
import {fetchLastOpenVotings} from '../../screens/oracles/utils'
import {useAuthState} from '../providers/auth-context'
import {loadPersistentStateValue} from '../utils/persist'

export default function useUnreadOraclesCount() {
  const [count, setCount] = useState(0)
  const {coinbase} = useAuthState()
  const router = useRouter()

  const {data, refetch} = useQuery(
    ['fetch-unread-oracles', coinbase],
    () => fetchLastOpenVotings({oracle: coinbase}),
    {
      initialData: [],
      enabled: !!coinbase,
    }
  )

  useEffect(() => {
    router.events.on('routeChangeStart', refetch)
    return () => {
      router.events.off('routeChangeStart', refetch)
    }
  }, [refetch, router.events])

  useEffect(() => {
    if (!data) return
    const lastVotingTimestamp =
      loadPersistentStateValue('votings', 'lastVotingTimestamp') || new Date(0)

    setCount(
      data.filter(
        ({createTime}) => new Date(createTime) > new Date(lastVotingTimestamp)
      ).length
    )
  }, [data])

  const reset = () => refetch()

  return [count, reset]
}
