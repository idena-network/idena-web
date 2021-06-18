import axios from 'axios'

export default async (req, res) => {
  try {
    const {authenticationEndpoint, token, signature} = req.body

    const {data} = await axios.post(authenticationEndpoint, {
      token,
      signature,
    })

    const {data: jsonResponse, error, success} = data

    if (success) return res.status(200).json({data: jsonResponse})
    return res.status(400).json({error})
  } catch (error) {
    return res
      .status(error?.response?.status ?? 400)
      .json({error: error?.response?.data || error?.message})
  }
}
