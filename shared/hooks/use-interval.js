import {useEffect, useRef} from 'react'

export function useInterval(callback, delay, useImmediately = false) {
  const savedCallback = useRef()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    let timeoutId

    function tick() {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        Promise.resolve(savedCallback.current()).then(tick())
      }, delay)
    }

    if (delay !== null) {
      if (useImmediately) Promise.resolve(savedCallback.current()).then(tick())
      else tick()
      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [delay, useImmediately])
}

export function usePoll([{method, params, ...rest}, callRpc], delay) {
  useInterval(() => callRpc(method, ...params), delay)
  return [{method, params, ...rest}, callRpc]
}
