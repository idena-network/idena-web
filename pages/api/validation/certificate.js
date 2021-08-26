import {query as q} from 'faunadb'
import {CertificateActionType} from '../../../shared/types'
import {faunaClient} from '../../../shared/utils/faunadb'

const TEST_SHORT_FLIPS_COUNT = 6
const TEST_LONG_FLIPS_COUNT = 18
const TEST_REPORTS_COUNT = 6

export default async (req, res) => {
  const {id, full} = req.query

  const isFull = parseInt(full)

  if (!id) {
    return res.status(400).send('id is missing')
  }
  try {
    const validation = await faunaClient.query(
      q.Get(q.Match(q.Index('validation_by_id'), id))
    )

    if (!validation.data.result) {
      return res.status(400).send('result missing')
    }

    if (validation.data.result.actionType !== CertificateActionType.Passed) {
      return res.status(400).send('validation failed')
    }

    const result = {
      shortScore: validation.data.result.shortPoints / TEST_SHORT_FLIPS_COUNT,
      longScore: validation.data.result.longPoints / TEST_LONG_FLIPS_COUNT,
      reportScore: validation.data.result.reports / TEST_REPORTS_COUNT,
      actionType: validation.data.result.actionType,
      coinbase: validation.data.coinbase,
      timestamp: validation.data.time,
      type: validation.data.type,
    }

    if (isFull) {
      result.shortFlips = validation.data.shortAnswers
      result.longFlips = validation.data.longAnswers
    }

    return res.status(200).json(result)
  } catch (e) {
    return res.status(400).send('validation missing')
  }
}
