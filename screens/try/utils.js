import dayjs from 'dayjs'
import {CertificateType} from '../../shared/types'

export function GetNextUTCValidationDate() {
  const dt = new Date()
  dt.setDate(dt.getDate() + 1)
  dt.setUTCHours(13, 30, 0, 0)
  return dt
}

export function canScheduleValidation(type, nextValidationDate) {
  const current = dayjs()
  const nextValidation = dayjs(nextValidationDate)

  switch (type) {
    case CertificateType.Beginner: {
      return current.add(40, 'm').isBefore(nextValidation)
    }
    case CertificateType.Expert: {
      return current.add(1, 'h').isBefore(nextValidation)
    }
    case CertificateType.Master: {
      return current.add(1, 'd').get('d') !== nextValidation.get('d')
    }
    default:
      return false
  }
}
