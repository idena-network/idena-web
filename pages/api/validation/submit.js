import {SessionType} from '../../../shared/types'
import {checkSignature} from '../../../shared/utils/crypto'
import {createPool} from '../../../shared/utils/pg'

export default async (req, res) => {
  const {type, id, answers, signature} = req.body

  if (!id) {
    return res.status(400).send('id is missing')
  }

  const coinbase = checkSignature(id, signature)?.toLowerCase()

  if (!coinbase) throw new Error('signature is invalid')

  try {
    const field = type === SessionType.Short ? 'shortFlips' : 'longFlips'

    const pool = createPool()

    const data = await pool.query(
      `select flips->'${field}' as flips from validations where id = $1`,
      [id]
    )

    const result = data.rows[0].flips.map(x => ({
      ...x,
      ...answers.find(y => y.hash === x.hash),
    }))

    await pool.query(
      `update validations set flips = jsonb_set(flips, '{${field}}', $2::jsonb) where id = $1`,
      [id, JSON.stringify(result)]
    )

    return res.status(200).end()
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
