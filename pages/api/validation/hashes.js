import {query as q} from 'faunadb'
import {SessionType} from '../../../shared/types'
import {faunaClient} from '../../../shared/utils/faunadb'

export default async (req, res) => {
  const {type, id} = req.query

  if (!id) {
    return res.status(400).send('id is missing')
  }
  try {
    const field = type === SessionType.Short ? 'shortFlips' : 'longFlips'

    const flips = await faunaClient.query(
      q.Select(['data', field], q.Get(q.Match(q.Index('validation_by_id'), id)))
    )

    return res.status(200).json(flips.map(x => x.hash))
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
