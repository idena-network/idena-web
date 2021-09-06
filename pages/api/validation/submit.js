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
