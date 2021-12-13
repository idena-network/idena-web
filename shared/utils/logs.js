/* eslint-disable import/no-named-default */
// eslint-disable-next-line import/no-named-default
import {default as redactObj} from 'redact-object'
import db from './db'

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

export async function writeValidationLog(epoch, data) {
  try {
    await db
      .table('logs')
      .add({epoch, timestamp: new Date().toISOString(), log: redact(data)})
  } catch {
    console.error('cannot write logs to IndexedDb', data)
  }
}

export async function readValidationLogs(epoch) {
  return db
    .table('logs')
    .where({epoch})
    .toArray()
}
