import {query as q} from 'faunadb'
import {CertificateActionType} from '../../../shared/types'
import {faunaClient} from '../../../shared/utils/faunadb'

async function getFlip(hash) {
  try {
    const {data} = await faunaClient.query(
      q.Paginate(
        q.Match(q.Index('flips_by_hash_with_answer_isReported'), hash),
        {size: 1}
      )
    )

    const [answer, isReported] = data[0]
    return {
      answer,
      isReported,
    }
  } catch (e) {
    return null
  }
}

async function checkShortAnswers(shortAnswers = []) {
  const res = {}

  await Promise.all(
    shortAnswers.map(async ({hash, answer}) => {
      const flip = await getFlip(hash)
      if (!flip) {
        return
      }

      res[hash] = {
        hash,
        answer,
        correct: answer === flip.answer,
      }
    })
  )

  return shortAnswers.map(({hash}) => res[hash])
}

async function checkLongAnswers(longAnswers = []) {
  const res = {}

  await Promise.all(
    longAnswers.map(async ({hash, answer, wrongWords}) => {
      const flip = await getFlip(hash)
      if (!flip) {
        return
      }
      res[hash] = {
        hash,
        answer,
        wrongWords,
        correct: answer === flip.answer,
        reason: flip.isReported,
        correctReport: flip.isReported && wrongWords,
      }
    })
  )

  return longAnswers.map(({hash}) => res[hash])
}

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

    const shortAnswers = await checkShortAnswers(validation.data.shortAnswers)
    const longAnswers = await checkLongAnswers(validation.data.longAnswers)

    const correctShortAnswers = shortAnswers.filter(x => x.correct).length
    const correctLongAnswers = longAnswers.filter(x => x.correct).length
    const correctReports = longAnswers
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
          shortAnswers,
          longAnswers,
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
