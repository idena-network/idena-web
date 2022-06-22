import {useEffect, useState} from 'react'

export function useIdenaBot() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    try {
      setConnected(JSON.parse(localStorage.getItem('connectIdenaBot')))
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }, [])

  return [
    connected,
    {
      persist: () => {
        localStorage.setItem('connectIdenaBot', true)
        setConnected(true)
      },
      skip: () => setConnected(true),
    },
  ]
}
