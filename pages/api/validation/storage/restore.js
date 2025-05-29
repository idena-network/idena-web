import {checkSignature} from '../../../../shared/utils/crypto'
import {createPool} from '../../../../shared/utils/pg'

export default async (req, res) => {
  try {
    const {coinbase, signature} = req.query

    const recoveredCoinbase = checkSignature(coinbase, signature)?.toLowerCase()

    if (!recoveredCoinbase || coinbase !== recoveredCoinbase)
      throw new Error('signature is invalid')

    const pool = createPool()

    const data = await pool.query(
      `select data from "validation-storage" where coinbase = $1`,
      [coinbase]
    )

    if (!data.rowCount) {
      return res.status(200).json(null)
    }

    return res.status(200).json(data.rows[0].data)
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
