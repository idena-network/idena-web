import {query as q} from 'faunadb'
import {checkSignature} from '../../../../shared/utils/crypto'
import {faunaClient} from '../../../../shared/utils/faunadb'

export default async (req, res) => {
  try {
    const {data, coinbase, signature} = req.body

    const recoveredCoinbase = checkSignature(coinbase, signature)?.toLowerCase()

    if (!recoveredCoinbase || coinbase !== recoveredCoinbase)
      throw new Error('signature is invalid')

    await faunaClient.query(
      q.Let(
        {
          match: q.Match(q.Index('validation-storage_by_coinbase'), coinbase),
        },
        q.If(
          q.Exists(q.Var('match')),
          q.Let(
            {
              item: q.Get(q.Var('match')),
              ts: q.Select(['data', 'value', 'timestamp'], q.Var('item')),
              ref: q.Select('ref', q.Var('item')),
            },
            q.If(
              q.LT(q.Var('ts'), data.timestamp),
              q.Update(q.Var('ref'), {
                data: {value: data},
              }),
              q.Abort('no need to persist expired data')
            )
          ),
          q.Create(q.Collection('validation-storage'), {
            data: {coinbase, value: data},
          })
        )
      )
    )
    return res.status(200).end()
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
