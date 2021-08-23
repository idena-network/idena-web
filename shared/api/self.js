import axios from 'axios'

export async function requestTestValidation(type, coinbase) {
  const {data} = await axios.post('/api/validation/start', {
    type,
    coinbase,
  })

  return data
}

export async function getFlip(hash) {
  const {data} = await axios.get('/api/validation/flip', {
    params: {
      hash,
    },
  })
  return data
}

export async function getHashes(id, type) {
  const {data} = await axios.get('/api/validation/hashes', {
    params: {
      id,
      type,
    },
  })
  return data
}

export async function submitAnswers(id, type, answers) {
  const {data} = await axios.post('/api/validation/submit', {
    id,
    type,
    answers,
  })

  return data
}

export async function getResult(id) {
  const {data} = await axios.post('/api/validation/result', {
    id,
  })

  return data
}

export async function getCertificate(id) {
  const {data} = await axios.get('/api/validation/certificate', {
    params: {id},
  })

  return data
}
