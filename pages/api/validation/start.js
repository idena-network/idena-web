import {query as q} from 'faunadb'
import {v4 as uuidv4} from 'uuid'
import {shuffle} from '../../../shared/utils/arr'
import {faunaClient} from '../../../shared/utils/faunadb'

export default async (req, res) => {
  try {
    const {type, coinbase} = req.body

    const {data} = await faunaClient.query(
      q.Paginate(q.Match(q.Index('flip_hashes')), {size: 500})
    )

    const a = []
    const b = []
    const c = []

    data.forEach(([hash, isReported]) => {
      if (isReported === 0) {
        a.push(hash)
      } else if (isReported === 1) {
        b.push(hash)
      } else {
        c.push(hash)
      }
    })

    shuffle(a)
    shuffle(b)
    shuffle(c)

    const shortFlips = a.slice(0, 6)
    const longFlips = shuffle(
      a
        .slice(6, 18)
        .concat(b.slice(0, 3))
        .concat(c.slice(0, 3))
    )

    const dt = new Date()

    const result = {
      id: uuidv4(),
      coinbase,
      time: dt.setMinutes(dt.getMinutes() + 1),
      shortFlips,
      longFlips,
      type,
    }

    await faunaClient.query(
      q.Create(q.Collection('validations'), {
        data: result,
      })
    )

    return res.status(200).json({id: result.id, startTime: result.time})
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
