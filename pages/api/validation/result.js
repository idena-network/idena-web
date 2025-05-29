import {CertificateActionType} from '../../../shared/types'
import {createPool} from '../../../shared/utils/pg'

export default async (req, res) => {
  const {id} = req.body

  if (!id) {
    return res.status(400).send('id is missing')
  }
  try {
    const pool = createPool()

    const data = await pool.query('select * from validations where id = $1', [
      id,
    ])

    const validation = data.rows[0]

    if (validation.result.actionType) {
      return res.status(200).json(validation.result)
    }

    if (new Date() < new Date(validation.time)) {
      return res.status(400).send('validation has not started yet')
    }

    const shortFlips = validation.flips.shortFlips.map(x => ({
      ...x,
      correct: x.rightAnswer === x.answer,
    }))

    const longFlips = validation.flips.longFlips.map(x => ({
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

    const result = {
      shortPoints: correctShortAnswers,
      longPoints: correctLongAnswers,
      reports: correctReports,
      actionType,
    }

    await pool.query(
      `
      update validations 
        set flips = jsonb_set(
                      jsonb_set(flips, '{shortFlips}', $2::jsonb),
                      '{longFlips}', $3::jsonb
                    ), 
                    result = $4 
                    where id = $1`,
      [
        id,
        JSON.stringify(shortFlips),
        JSON.stringify(longFlips),
        {
          shortPoints: correctShortAnswers,
          longPoints: correctLongAnswers,
          reports: correctReports,
          actionType,
        },
      ]
    )

    return res.status(200).json(result)
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
