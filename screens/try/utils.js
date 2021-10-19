import dayjs from 'dayjs'
import {AnswerType, CertificateType} from '../../shared/types'

export function GetNextUTCValidationDate() {
  const dt = new Date()

  return Date.UTC(
    dt.getUTCFullYear(),
    dt.getUTCMonth(),
    dt.getUTCDate() + 1,
    13,
    30,
    0,
    0
  )
}

export function canScheduleValidation(type, nextValidationDate) {
  const current = dayjs()
  const nextValidation = dayjs(nextValidationDate)

  switch (type) {
    case CertificateType.Easy: {
      return current.add(40, 'm').isBefore(nextValidation)
    }
    case CertificateType.Medium: {
      return current.add(1, 'h').isBefore(nextValidation)
    }
    case CertificateType.Hard: {
      return current.add(1, 'd').get('date') !== nextValidation.get('date')
    }
    default:
      return false
  }
}

export function GetAnswerTitle(t, answer) {
  switch (answer) {
    case AnswerType.Left:
      return t('Left')
    case AnswerType.Right:
      return t('Right')
    default:
      return t('No answer')
  }
}
