import axios from 'axios'

export async function getLastBlock() {
  const {data} = await axios.get('https://api.idena.io/api/block/last')
  return data
}
