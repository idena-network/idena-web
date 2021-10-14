import {query as q} from 'faunadb'
import {v4 as uuidv4} from 'uuid'
import {GetNextUTCValidationDate} from '../../../screens/try/utils'
import {CertificateType} from '../../../shared/types'
import {shuffle} from '../../../shared/utils/arr'
import {checkSignature} from '../../../shared/utils/crypto'
import {faunaClient} from '../../../shared/utils/faunadb'
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

    const {data} = await faunaClient.query(
      q.Paginate(
        q.Match(q.Index('flip_hashes_with_answer_reason_isDisabled')),
        {
          size: 500,
        }
      )
    )

    const a = []
    const b = []
    const c = []

    data.forEach(([hash, answer, reason, isDisabled]) => {
      if (isDisabled) return
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

    await faunaClient.query(
      q.Do(
        q.Map(
          q.Paginate(
            q.Match(
              q.Index('validation_by_coinbase_type_active'),
              coinbase,
              type,
              true
            ),
            {
              size: 10,
            }
          ),
          q.Lambda('ref', q.Update(q.Var('ref'), {data: {active: false}}))
        ),
        q.Create(q.Collection('validations'), {
          data: result,
        })
      )
    )

    return res.status(200).json({id: result.id, startTime: result.time})
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
