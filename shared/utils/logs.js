import redact from 'redact-object'

const redactValues = [
  'privateKey',
  'hex',
  'publicHex',
  'privateHex',
  'pics',
  'urls',
  'images',
]

export function info(ctx, data) {
  let resData = {...ctx}
  if (typeof data === 'object') {
    resData = {
      ...resData,
      ...redact(data, redactValues, undefined, {ignoreUnknown: true}),
      message: `context - ${ctx ? ctx.coinbase : 'undefined context'}`,
    }
  } else {
    resData = {
      ...resData,
      message: `${data} - ${ctx ? ctx.coinbase : 'undefined context'}`,
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
