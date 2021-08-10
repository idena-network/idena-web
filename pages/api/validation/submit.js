import {query as q} from 'faunadb'
import {SessionType} from '../../../shared/types'
import {faunaClient} from '../../../shared/utils/faunadb'

export default async (req, res) => {
  const {type, id, answers} = req.body

  if (!id) {
    return res.status(400).send('id is missing')
  }

  const data = {}

  if (type === SessionType.Short) {
    data.shortAnswers = answers
  } else {
    data.longAnswers = answers
  }

  try {
    await faunaClient.query(
      q.Update(
        q.Select('ref', q.Get(q.Match(q.Index('validation_by_id'), id))),
        {
          data,
        }
      )
    )

    return res.status(200).end()
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
