// eslint-disable-next-line import/no-named-default
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

export function info(ctx, data) {
  let resData = {...ctx}
  if (typeof data === 'object') {
    resData = {
      ...resData,
      ...redactObj(data, redactValues, undefined, {ignoreUnknown: true}),
      message: `machine context`,
    }
  } else {
    resData = {
      ...resData,
      message: data.toString(),
    }
  }

  return fetch('/api/logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resData),
  })
}
