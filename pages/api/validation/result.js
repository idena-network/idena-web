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
  let correctAnswers = 0

  await Promise.all(
    shortAnswers.map(async ({hash, answer}) => {
      const flip = await getFlip(hash)
      if (!flip) {
        return
      }
      if (answer === flip.answer) {
        correctAnswers += 1
      }
    })
  )

  return {correctAnswers}
}

async function checkLongAnswers(longAnswers = []) {
  let correctAnswers = 0
  let correctReports = 0
  await Promise.all(
    longAnswers.map(async ({hash, answer, wrongWords}) => {
      const flip = await getFlip(hash)
      if (!flip) {
        return
      }
      if (answer === flip.answer) {
        correctAnswers += 1
      }
      if (flip.isReported) {
        if (wrongWords) {
          correctReports += 1
        }
      }
    })
  )
  return {correctAnswers, correctReports}
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

    const {correctAnswers: correctShortAnswers} = await checkShortAnswers(
      validation.data.shortAnswers
    )
    const {
      correctAnswers: correctLongAnswers,
      correctReports,
    } = await checkLongAnswers(validation.data.longAnswers)

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
