import {createPool} from '../../../shared/utils/pg'

export default async (req, res) => {
  try {
    const pool = createPool()
    const data = await pool.query(
      `select hash, data->'images'->>0 as "firstImage", data->'keywords' as keywords from flips where hash = $1`,
      [req.query.hash]
    )

    return res.status(200).json({
      ...data.rows[0],
    })
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
