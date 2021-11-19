import {useEffect, useState} from 'react'

export function use100vh() {
  const [height, setHeight] = useState(null)

  useEffect(() => {
    setHeight(window.innerHeight)
  }, [])

  return height
}
