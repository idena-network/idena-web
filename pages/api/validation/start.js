import {v4 as uuidv4} from 'uuid'
import {GetNextUTCValidationDate} from '../../../screens/try/utils'
import {CertificateType} from '../../../shared/types'
import {shuffle} from '../../../shared/utils/arr'
import {checkSignature} from '../../../shared/utils/crypto'
import {createPool} from '../../../shared/utils/pg'
import {isVercelProduction} from '../../../shared/utils/utils'

function calcDevValidationStart(type) {
  const dt = new Date()
  switch (type) {
    case CertificateType.Easy:
      return dt.setMinutes(dt.getMinutes() + 1)
    case CertificateType.Medium:
      return dt.setMinutes(dt.getMinutes() + 30)
    case CertificateType.Hard:
      return dt.setHours(dt.getHours() + 1)
    default:
      return 0
  }
}

function calcValidationStart(type) {
  const dt = new Date()
  switch (type) {
    case CertificateType.Easy:
      return dt.setMinutes(dt.getMinutes() + 1)
    case CertificateType.Medium:
      return dt.setHours(dt.getHours() + 1)
    case CertificateType.Hard: {
      return GetNextUTCValidationDate()
    }
    default:
      return 0
  }
}

export default async (req, res) => {
  try {
    const {type, coinbase, signature} = req.body

    const recoveredCoinbase = checkSignature(coinbase, signature)?.toLowerCase()

    if (!recoveredCoinbase || coinbase !== recoveredCoinbase)
      throw new Error('signature is invalid')

    const pool = createPool()

    const data = await pool.query(
      'select hash, answer, is_reported as reason from flips where is_disabled = false'
    )

    const a = []
    const b = []
    const c = []

    data.rows.forEach(({hash, answer, reason}) => {
      if (reason === 0) {
        a.push({hash, rightAnswer: answer, reason})
      } else if (reason === 1) {
        b.push({hash, rightAnswer: answer, reason})
      } else {
        c.push({hash, rightAnswer: answer, reason})
      }
    })

    shuffle(a)
    shuffle(b)
    shuffle(c)

    const shortFlips = a.slice(0, 6)
    const longFlips = shuffle(
      a
        .slice(6, 18)
        .concat(b.slice(0, 3))
        .concat(c.slice(0, 3))
    )

    const result = {
      id: uuidv4(),
      coinbase,
      time: isVercelProduction
        ? calcValidationStart(type)
        : calcDevValidationStart(type),
      shortFlips,
      longFlips,
      type,
      active: true,
    }

    await pool.query(
      'update validations set is_active = false where coinbase = $1 and is_active = true and type = $2',
      [coinbase, result.type]
    )

    await pool.query(
      'insert into validations (id, coinbase, type, is_active, flips, time) values ($1, $2, $3, $4, $5, $6)',
      [
        result.id,
        result.coinbase,
        result.type,
        true,
        {shortFlips, longFlips},
        new Date(result.time),
      ]
    )

    return res.status(200).json({id: result.id, startTime: result.time})
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
