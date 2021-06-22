/* eslint-disable import/no-named-default */
// eslint-disable-next-line import/no-named-default
import {useEffect, useState} from 'react'
import {default as redactObj} from 'redact-object'

const redactValues = [
  'privateKey',
  'hex',
  'publicHex',
  'privateHex',
  'pics',
  'urls',
  'images',
]

export function redact(msg) {
  if (typeof msg === 'object') {
    return redactObj(msg, redactValues, undefined, {ignoreUnknown: true})
  }
  return msg
}

export function useLocalStorageLogger(name) {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    try {
      const data = localStorage.getItem(name)
      if (data) {
        const result = JSON.parse(data)
        if (Array.isArray(result)) setLogs(result)
      }
    } catch (e) {
      console.error('cannot initialize logs', e)
    }
  }, [name])

  const info = data => {
    try {
      logs.push(JSON.stringify(redact(data)))
      localStorage.setItem(name, JSON.stringify(logs))
    } catch {
      console.error('cannot write logs to localStorage')
    }
  }
  return info
}
