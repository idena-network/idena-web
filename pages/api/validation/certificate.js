import {query as q} from 'faunadb'
import {CertificateActionType} from '../../../shared/types'
import {faunaClient} from '../../../shared/utils/faunadb'

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

    const result = {
      shortScore: validation.data.result.shortPoints,
      longScore: validation.data.result.longPoints,
      reportScore: validation.data.result.reports,
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
