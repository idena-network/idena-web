import {State} from 'xstate'
import dayjs, {isDayjs} from 'dayjs'
import {EpochPeriod, IdentityStatus} from '../../shared/types'
import db from '../../shared/utils/db'

export const decodedFlip = ({decoded}) => decoded

/**
 * All regular, not extra, flips regardless of it readiness
 * @param {*} flips
 */
export function filterRegularFlips(flips) {
  return flips.filter(({extra}) => !extra)
}

export const solvableFlips = ({decoded}) => decoded
/**
 * Fully fetched and decoded flips
 * @param {*} flips
 */
export function filterSolvableFlips(flips) {
  return flips.filter(solvableFlips)
}

export const failedFlip = ({decoded, missing, extra}) =>
  !extra && (!decoded || missing)

export const availableExtraFlip = ({extra, decoded}) => extra && decoded

export const missingFlip = ({missing}) => missing

export function rearrangeFlips(flips) {
  const solvable = []
  const loading = []
  const invalid = []
  const extras = []
  for (let i = 0; i < flips.length; i += 1) {
    const {fetched, decoded, failed, extra} = flips[i]
    if (extra) {
      extras.push(flips[i])
    } else if (decoded) {
      solvable.push(flips[i])
    } else if (failed || fetched) {
      invalid.push(flips[i])
    } else {
      loading.push(flips[i])
    }
  }
  solvable.sort((a, b) => a.flipIndex - b.flipIndex)
  return [...solvable, ...loading, ...invalid, ...extras]
}

export function flipExtraFlip({extra, ...flip}) {
  return {...flip, extra: !extra, flipped: true}
}

export function hasEnoughAnswers(flips) {
  const solvable = flips.filter(({decoded, extra}) => decoded && !extra)
  const answered = solvable.filter(({option}) => option)
  return solvable.length && answered.length / solvable.length >= 0.6
}

export function missingHashes(flips) {
  return flips.filter(missingFlip).map(({hash}) => hash)
}

export function exponentialBackoff(retry) {
  return Math.min(2 ** retry + Math.random(), 32)
}

export function persistValidationState(state) {
  localStorage.setItem('validation', JSON.stringify(state))
}

export function loadValidationState() {
  return JSON.parse(localStorage.getItem('validation'))
}

export function hasValidationResults() {
  return !!localStorage.getItem('validationResults')
}

export function parsePersistedValidationState() {
  const stateDef = loadValidationState()
  return stateDef && State.create(stateDef)
}

export function clearValidationState() {
  localStorage.removeItem('validation')
}

export function canValidate(identity) {
  if (!identity) {
    return false
  }

  const {requiredFlips, flips, state} = identity

  const numOfFlipsToSubmit = requiredFlips - (flips || []).length
  const shouldSendFlips = numOfFlipsToSubmit > 0

  return (
    ([
      IdentityStatus.Human,
      IdentityStatus.Verified,
      IdentityStatus.Newbie,
    ].includes(state) &&
      !shouldSendFlips) ||
    [
      IdentityStatus.Candidate,
      IdentityStatus.Suspended,
      IdentityStatus.Zombie,
    ].includes(state)
  )
}

export function shouldStartValidation(epoch, identity) {
  if (!epoch || !identity) return false

  const currentTime = new Date().getTime()
  const nextValidationTime = new Date(epoch.nextValidation).getTime()

  const isValidationRunning =
    (currentTime > nextValidationTime && EpochPeriod.FlipLottery) ||
    [EpochPeriod.ShortSession, EpochPeriod.LongSession].includes(
      epoch.currentPeriod
    )

  if (isValidationRunning && canValidate(identity)) {
    // remove old flips
    db.table('flips')
      .where('epoch')
      .below(epoch.epoch)
      .delete()
      .catch(e => {
        console.error('cannot delete old flips', e)
      })

    const validationStateDefinition = loadValidationState()
    if (validationStateDefinition) {
      const persistedValidationState = State.create(validationStateDefinition)
      const isDone = persistedValidationState.done

      const isSameEpoch = epoch.epoch === persistedValidationState.context.epoch

      if (!isSameEpoch) {
        clearValidationState()
      }
      return !isDone || !isSameEpoch
    }

    return true
  }

  return false
}

export function didValidate(currentEpoch) {
  const validationStateDefinition = loadValidationState()

  if (validationStateDefinition) {
    const {epoch} = State.create(validationStateDefinition).context
    return currentEpoch > epoch
  }

  return false
}

export function shouldTranslate(translations, flip) {
  if (!flip) return false

  const {words} = flip

  return !!(
    words &&
    words.length &&
    !words
      .map(({id}) => translations[id])
      .reduce((acc, curr) => !!curr && acc, true)
  )
}

export function shouldPollLongFlips(
  flips,
  {validationStart, shortSessionDuration}
) {
  return (
    flips.some(({ready}) => !ready) &&
    dayjs().isBefore(
      (isDayjs(validationStart) ? validationStart : dayjs(validationStart))
        .add(shortSessionDuration, 's')
        .add(2, 'minute')
    )
  )
}

export const decodedWithKeywords = ({decoded, words}) =>
  decoded && words?.length > 0

export const decodedWithoutKeywords = ({decoded, words}) =>
  decoded && (!words || !words.length)

export function availableReportsNumber(flips) {
  return Math.floor(flips.length / 3)
}

export const transformLog = data => {
  if (typeof data === 'object') {
    const {context, event} = data

    if (event?.data instanceof Error) {
      const error = event.data
      let {message} = error

      if (error.response) message = error.response.data
      else if (error.request)
        message = error.request.message || 'Request failed'

      return {
        context,
        event: {
          type: event.type,
          data: message,
        },
      }
    }
    return {context, event}
  }
  return data
}
