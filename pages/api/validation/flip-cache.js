import {query as q} from 'faunadb'
import {faunaClient} from '../../../shared/utils/faunadb'

export default async (req, res) => {
  try {
    const {data} = await faunaClient.query(
      q.Get(q.Match(q.Index('flips-cache_by_hash'), req.query.hash))
    )
    return res.status(200).json(data)
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
