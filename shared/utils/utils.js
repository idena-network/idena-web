import dayjs from 'dayjs'
import {useBreakpointValue} from '@chakra-ui/react'
import {isMobile} from 'react-device-detect'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import {getRpcParams} from '../api/api-client'
import {IdentityStatus} from '../types'
import {stripHexPrefix} from './buffers'
import i18n from '../../i18n'

dayjs.extend(duration)
dayjs.extend(relativeTime)

export const HASH_IN_MEMPOOL =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

export const dummyAddress = `0x${'2'.repeat(64)}`

export function createRpcCaller({url, key}) {
  return async function(method, ...params) {
    const {result, error} = await (
      await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method,
          params,
          id: 1,
          key,
        }),
      })
    ).json()
    if (error) throw new Error(error.message)
    return result
  }
}

export function callRpc(method, ...params) {
  return createRpcCaller(getRpcParams())(method, ...params)
}

export function toPercent(value, locale) {
  return value?.toLocaleString(locale ?? i18n.language, {
    style: 'percent',
    maximumSignificantDigits: 4,
  })
}

export const toLocaleNumber = (locale, options) => {
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 18,
    ...options,
  })
  return value => `${formatter.format(value)}`
}

export const toLocaleDna = (locale, options) => value =>
  `${toLocaleNumber(locale, options)(value)} iDNA`

export const eitherState = (current, ...states) => states.some(current.matches)

// the NTP algorithm
// t0 is the client's timestamp of the request packet transmission,
// t1 is the server's timestamp of the request packet reception,
// t2 is the server's timestamp of the response packet transmission and
// t3 is the client's timestamp of the response packet reception.
export function ntp(t0, t1, t2, t3) {
  return {
    roundTripDelay: t3 - t0 - (t2 - t1),
    offset: (t1 - t0 + (t2 - t3)) / 2,
  }
}

export function mapIdentityToFriendlyStatus(status) {
  switch (status) {
    case IdentityStatus.Undefined:
      return 'Not validated'
    default:
      return status
  }
}

export function promiseTimeout(p, timeout) {
  return Promise.race([
    p,
    new Promise((_, reject) => setTimeout(reject, timeout)),
  ])
}

export function buildNextValidationCalendarLink(nextValidation) {
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=${dayjs(
    nextValidation
  ).format('YYYYMMDDTHHmmssZ')}%2F${dayjs(nextValidation)
    .add(30, 'minute')
    .format(
      'YYYYMMDDTHHmmssZ'
    )}&details=Plan%20your%20time%20in%20advance%20to%20take%20part%20in%20the%20validation%20ceremony%21%20Before%20the%20ceremony%2C%20read%20our%20explainer%20of%20how%20to%20get%20validated%3A%20https%3A%2F%2Fmedium.com%2Fidena%2Fhow-to-pass-a-validation-session-in-idena-1724a0203e81&text=Idena%20Validation%20Ceremony`
}

export function formatValidationDate(nextValidation) {
  return new Date(nextValidation).toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function mapToFriendlyStatus(status) {
  switch (status) {
    case IdentityStatus.Undefined:
      return 'Not validated'
    default:
      return status
  }
}

export const byId = ({id: givenId}) => ({id: currentId}) =>
  currentId === givenId

export function calculateInvitationRewardRatio(
  {startBlock, nextValidation},
  {highestBlock}
) {
  const endBlock =
    highestBlock + dayjs(nextValidation).diff(dayjs(), 'minute') * 3

  const t = (highestBlock - startBlock) / (endBlock - startBlock)

  return Math.max(1 - t ** 4 * 0.5, 0)
}

export const openExternalUrl = href => {
  if (typeof window !== 'undefined') return window.open(href, '_blank')
}

export const toBlob = base64 => fetch(base64).then(res => res.blob())

export const isVercelProduction =
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'

export const lowerCase = str => str?.toLowerCase()

export function areSameCaseInsensitive(a, b) {
  return a?.toUpperCase() === b?.toUpperCase()
}

export function validateInvitationCode(code) {
  try {
    const raw = stripHexPrefix(code)
    const re = /[0-9A-Fa-f]{64}/g
    const match = raw.match(re)
    return match?.length && match[0] === raw
  } catch {
    return false
  }
}

export function useIsDesktop() {
  const isDesktop = useBreakpointValue([false, true])
  return isDesktop
}

export function clampValue(min, max, value) {
  return Math.min(Math.max(value, min), max)
}

export function roundToPrecision(precision, value) {
  return (
    Math.ceil((Number(value) + Number.EPSILON) * 10 ** precision) /
    10 ** precision
  )
}

export function getDateFromBlocks(needBlock = 0, currentBlock = 0) {
  return dayjs().add((needBlock - currentBlock) * 20, 'second')
}

export function formatDateTimeShort(dt) {
  return new Date(dt).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

const browserClientType = parseInt(process.env.NEXT_PUBLIC_WEB_CLIENT_TYPE || 3)

const mobileClientType = parseInt(
  process.env.NEXT_PUBLIC_WEB_CLIENT_TYPE_MOBILE || 4
)

export const webClientType = isMobile ? mobileClientType : browserClientType

export function pick(obj, keys) {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => keys.includes(k))
  )
}

export function omit(obj, keys) {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !keys.includes(k))
  )
}

export const prependHex = hex => (hex?.startsWith('0x') ? hex : `0x${hex}`)

export function hexToObject(hex) {
  try {
    return JSON.parse(
      new TextDecoder().decode(Buffer.from(hex.substring(2), 'hex'))
    )
  } catch {
    return {}
  }
}

export const humanizeDuration = (d, unit = 's') =>
  dayjs.duration(d, unit).humanize()
