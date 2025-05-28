import {SessionType} from '../../../shared/types'
import {createPool} from '../../../shared/utils/pg'

export default async (req, res) => {
  const {type, id} = req.query

  if (!id) {
    return res.status(400).send('id is missing')
  }
  try {
    const field = type === SessionType.Short ? 'shortFlips' : 'longFlips'

    const pool = createPool()

    const data = await pool.query(
      `select flips->'${field}' as flips from validations where id = $1`,
      [id]
    )

    return res.status(200).json(data.rows[0].flips.map(x => x.hash))
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
