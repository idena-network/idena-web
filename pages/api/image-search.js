// eslint-disable-next-line camelcase
const {image_search} = require('duckduckgo-images-api')

export default async (req, res) => {
  try {
    const result = await image_search({
      query: req.query.q,
      moderate: true,
    })
    return res.status(200).json(result)
  } catch (e) {
    return res.status(400).send(e.toString())
  }
}
