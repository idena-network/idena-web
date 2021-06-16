import axios from 'axios'

export default async (req, res) => {
  try {
    const {nonceEndpoint, token, address} = req.body

    const {data} = await axios.post(nonceEndpoint, {
      token,
      address,
    })

    const {data: jsonData, error, success} = data

    if (success) return res.status(200).json({data: jsonData})
    return res.status(400).json({error})
  } catch (error) {
    return res
      .status(error?.response?.status ?? 400)
      .json({error: error?.response?.data || error?.message})
  }
}
