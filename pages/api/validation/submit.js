import {query as q} from 'faunadb'
import {SessionType} from '../../../shared/types'
import {checkSignature} from '../../../shared/utils/crypto'
import {faunaClient} from '../../../shared/utils/faunadb'

export default async (req, res) => {
  const {type, id, answers, signature} = req.body

  if (!id) {
    return res.status(400).send('id is missing')
  }

  const coinbase = checkSignature(id, signature)?.toLowerCase()

  if (!coinbase) throw new Error('signature is invalid')

  try {
    const data = {}

    const field = type === SessionType.Short ? 'shortFlips' : 'longFlips'

    const {ref, flips} = await faunaClient.query(
      q.Let(
        {
          validation: q.Get(q.Match(q.Index('validation_by_id'), id)),
        },
        {
          ref: q.Select('ref', q.Var('validation')),
          flips: q.Select(['data', field], q.Var('validation')),
        }
      )
    )

    data[field] = flips.map(x => ({
      ...x,
      ...answers.find(y => y.hash === x.hash),
    }))

    await faunaClient.query(
      q.Update(ref, {
        data,
      })
    )

    return res.status(200).end()
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
