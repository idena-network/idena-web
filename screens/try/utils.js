import dayjs from 'dayjs'
import {getFlip} from '../../shared/api/self'
import {AnswerType, CertificateType} from '../../shared/types'
import {shuffle} from '../../shared/utils/arr'
import {forEachAsync} from '../../shared/utils/fn'
import {toBlob} from '../../shared/utils/utils'

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

export async function loadWords(flips) {
  return Promise.resolve(flips.map(x => ({hash: x.hash, words: x.keywords})))
}

export async function fetchFlips(hashes, cb) {
  return forEachAsync(hashes, async hash => {
    const flip = await getFlip(hash)
    if (flip) {
      const images = await Promise.all(flip.images.map(toBlob))

      return cb({
        type: 'FLIP',
        flip: {
          time: dayjs(),
          images: images.map(URL.createObjectURL),
          orders: flip.orders,
          keywords: flip.keywords,
          answer: flip.answer,
          isReported: flip.isReported,
          hash,
          fetched: true,
          decoded: true,
        },
      })
    }
    return Promise.resolve(
      cb({
        type: 'FLIP',
        flip: {
          hash,
          missing: true,
          failed: true,
        },
      })
    )
  })
}

export function GetSampleShortHashes() {
  return shuffle([
    {hash: 'bafkreiawdutmmnwxez5riczigypuqlrh5nl6swerze6ojc3mip2msnecnm'},
    {hash: 'bafkreiabqp646x7ndnfkeithpttxh52x46rj42s5duonn2agsusaiaz3uq'},
    {hash: 'bafybeid5ch3vtneemq2lqvfmndldmjmyxoc4cstoxitojlfd2mkqcuofge'},
    {hash: 'bafkreicmv6qpr6oxke6issutha5bzgdkeredrm2oibndevllsuc5p63hry'},
    {hash: 'bafkreifsd7adg3qzsqp6lssok3iu6aytbfdgpf4f7jwprbuplxeiyzw75q'},
    {hash: 'bafkreiflbuv755vnttqcl2njnkxxq3s5blyvo46v4eeow5yftoslfqavri'},
  ])
}

export function GetSampleLongHashes() {
  return shuffle([
    {hash: 'bafkreie4gxb72g73cnfwncynyfyfgltcuokfna7mpzxmuxbwg66fam5n3a'},
    {hash: 'bafkreihdqtiuqfnilhrh5wgxojlsm3yql2wbfimi7nbpph4amtwa2ar5qa'},
    {hash: 'bafkreiejdoua6h2brvhqhpzqypzjwt55ibtrzcpdvux2r2zwfqqutv7v44'},
    {hash: 'bafkreiegngisqdb6z3lmfpmspl57w3xwwlpoxrmax5pgcf4ol2rh3jmy6y'},
    {hash: 'bafybeiaqi5mqlcpugjyolkvncggloixw3sqd7hngdnujqtumbxzbk65dsu'},
    {hash: 'bafybeiccmvsb5ohtz6fpuw2hakvha4w2k4xro2bzto7ijisr7a6zqxnxhq'},
    {hash: 'bafkreiabzk4giiskufg6wlx2odqjyxa66hebxzdtsq2zjp3nux6pjt4awu'},
    {hash: 'bafkreicly7zdoolpr5ewbmndtyluewyzz3yoas2xnavea72nt2uhnddn3m'},
    {hash: 'bafkreiapbkynui6ziybpiwrkvqrws4tzqnaxvwtfv6f3kx24jcdr24gvw4'},
  ])
}
