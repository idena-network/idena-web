import axios from 'axios'

export async function requestTestValidation(signature, coinbase, type) {
  const {data} = await axios.post('/api/validation/start', {
    type,
    signature,
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

export async function getFlipCache(hash) {
  const {data} = await axios.get('/api/validation/flip-cache', {
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

export async function submitAnswers(signature, id, type, answers) {
  const {data} = await axios.post('/api/validation/submit', {
    id,
    type,
    answers,
    signature,
  })

  return data
}

export async function getResult(id) {
  const {data} = await axios.post('/api/validation/result', {
    id,
  })

  return data
}

export async function getCertificate(id, full = false) {
  const {data} = await axios.get('/api/validation/certificate', {
    params: {id, full: full ? 1 : 0},
  })

  return data
}

export async function persistTestValidation(signature, coinbase, data) {
  await axios.post('/api/validation/storage/persist', {
    data,
    signature,
    coinbase,
  })

  return data
}

export async function restoreTestValidation(signature, coinbase) {
  const {data} = await axios.get('/api/validation/storage/restore', {
    params: {signature, coinbase},
  })

  return data
}

export async function getInvitationCode(name, refId) {
  try {
    const {data} = await axios.get('/api/get-invitation-code', {
      params: {name, refId},
    })
    return data
  } catch (e) {
    throw new Error(e.response?.data)
  }
}
