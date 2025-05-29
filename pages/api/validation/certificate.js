import {createPool} from '../../../shared/utils/pg'

export async function getCertificateData(id, full) {
  const pool = createPool()

  const data = await pool.query('select * from validations where id = $1', [id])

  if (!data.rowCount) {
    throw new Error('result is missing')
  }

  const validation = data.rows[0]

  const result = {
    active: validation.is_active,
    shortScore: validation.result.shortPoints,
    longScore: validation.result.longPoints,
    reportScore: validation.result.reports,
    actionType: validation.result.actionType,
    coinbase: validation.coinbase,
    timestamp: validation.time,
    type: validation.type,
  }

  if (full) {
    result.shortFlips = validation.flips.shortFlips
    result.longFlips = validation.flips.longFlips
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
    console.log(e)
    return res.status(400).send('validation missing')
  }
}
