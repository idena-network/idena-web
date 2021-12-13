import {query as q} from 'faunadb'
import {CertificateActionType} from '../../../shared/types'
import {faunaClient} from '../../../shared/utils/faunadb'

export default async (req, res) => {
  const {id} = req.body

  if (!id) {
    return res.status(400).send('id is missing')
  }
  try {
    const validation = await faunaClient.query(
      q.Get(q.Match(q.Index('validation_by_id'), id))
    )

    if (validation.data.result) {
      return res.status(200).json(validation.data.result)
    }

    if (new Date().getTime() < validation.data.time) {
      return res.status(400).send('validation has not started yet')
    }

    const shortFlips = validation.data.shortFlips.map(x => ({
      ...x,
      correct: x.rightAnswer === x.answer,
    }))

    const longFlips = validation.data.longFlips.map(x => ({
      ...x,
      correct: x.rightAnswer === x.answer,
      correctReport: Boolean(
        (x.reason && x.wrongWords) || (!x.reason && !x.wrongWords)
      ),
    }))

    const correctShortAnswers = shortFlips.filter(x => x.correct).length
    const correctLongAnswers = longFlips.filter(x => x.correct).length
    const correctReports = longFlips
      .filter(x => x.reason)
      .filter(x => x.correctReport).length

    let actionType = CertificateActionType.Passed
    if (
      correctShortAnswers < 4 ||
      correctLongAnswers < 14 ||
      correctReports < 4
    ) {
      actionType = CertificateActionType.Failed
    }

    const updated = await faunaClient.query(
      q.Update(validation.ref, {
        data: {
          shortFlips,
          longFlips,
          result: {
            shortPoints: correctShortAnswers,
            longPoints: correctLongAnswers,
            reports: correctReports,
            actionType,
          },
        },
      })
    )

    return res.status(200).json(updated.data.result)
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
