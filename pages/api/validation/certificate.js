import {query as q} from 'faunadb'
import {faunaClient} from '../../../shared/utils/faunadb'

export async function getCertificateData(id, full) {
  const validation = await faunaClient.query(
    q.Get(q.Match(q.Index('validation_by_id'), id))
  )

  if (!validation.data.result) {
    throw new Error('result is missing')
  }

  const result = {
    active: validation.data.active,
    shortScore: validation.data.result.shortPoints,
    longScore: validation.data.result.longPoints,
    reportScore: validation.data.result.reports,
    actionType: validation.data.result.actionType,
    coinbase: validation.data.coinbase,
    timestamp: validation.data.time,
    type: validation.data.type,
  }

  if (full) {
    result.shortFlips = validation.data.shortFlips
    result.longFlips = validation.data.longFlips
  }

  return result
}

export default async (req, res) => {
  const {id, full} = req.query

  const isFull = parseInt(full)

  if (!id) {
    return res.status(400).send('id is missing')
  }
  try {
    const result = await getCertificateData(id, isFull)

    return res.status(200).json(result)
  } catch (e) {
    return res.status(400).send('validation missing')
  }
}
