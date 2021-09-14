import {query as q} from 'faunadb'
import {checkSignature} from '../../../../shared/utils/crypto'
import {faunaClient} from '../../../../shared/utils/faunadb'

export default async (req, res) => {
  try {
    const {coinbase, signature} = req.query

    const recoveredCoinbase = checkSignature(coinbase, signature)?.toLowerCase()

    if (!recoveredCoinbase || coinbase !== recoveredCoinbase)
      throw new Error('signature is invalid')

    const resut = await faunaClient.query(
      q.Let(
        {
          match: q.Match(q.Index('validation-storage_by_coinbase'), coinbase),
        },
        q.If(
          q.Exists(q.Var('match')),
          q.Select('data', q.Get(q.Var('match'))),
          null
        )
      )
    )
    return res.status(200).json(resut?.value)
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
