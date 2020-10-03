/* eslint-disable no-bitwise */
import sha3 from 'js-sha3'
import BN from 'bn.js'
import {ec as EC} from 'elliptic'
import secp256k1 from 'secp256k1'
import eciesjs from 'idena-eciesjs'
import crypto from 'crypto'
import {hexToUint8Array, toHexString} from './buffers'
import PrivateKeysPackage from '../models/privateKeysPackage'
import PublicFlipKey from '../models/publicFlipKey'

const ec = new EC('secp256k1')

export function privateKeyToPublicKey(key) {
  const pubKey = ec
    .keyFromPrivate(key)
    .getPublic()
    .encode('array')
  return toHexString(pubKey, true)
}

export function privateKeyToAddress(key) {
  if (!key) {
    return '0x0000000000000000000000000000000000000000'
  }
  const pubKey = ec
    .keyFromPrivate(key)
    .getPublic()
    .encode('array')

  return toHexString(sha3.keccak_256.array(pubKey.slice(1)).slice(12), true)
}

export function decryptPrivateKey(data, passphrase) {
  const key = sha3.sha3_256.array(passphrase)
  const dataArray = Buffer.from(
    typeof data === 'string' ? hexToUint8Array(data) : new Uint8Array(data)
  )
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    dataArray.slice(0, 12)
  )
  decipher.setAuthTag(dataArray.slice(dataArray.length - 16))
  const decrypted = [
    ...decipher.update(dataArray.slice(12, dataArray.length - 16)),
    ...decipher.final(),
  ]
  return toHexString(decrypted)
}

export function preparePublicFlipKey(privateKey, epoch) {
  const publicFlipKey = generateFlipKey(true, epoch, privateKey)

  const p = new PublicFlipKey(epoch, publicFlipKey)
  p.sign(privateKey)
  return p
}

export function prepareFlipKeysPackage(candidates, privateKey, epoch) {
  const publicFlipKey = generateFlipKey(true, epoch, privateKey)
  const privateFlipKey = generateFlipKey(false, epoch, privateKey)

  const p = new PrivateKeysPackage(
    epoch,
    candidates,
    publicFlipKey,
    privateFlipKey
  )

  p.sign(privateKey)

  return p
}

export function createShortAnswersHash(key, epoch, hashesInOrder, answers) {
  const data = serializeAnswers(hashesInOrder, answers)
  const salt = generateShortAnswersSalt(epoch, key)
  return sha3.keccak_256.array([...data, ...salt])
}

export function generateShortAnswersSalt(epoch, key) {
  const hash = sha3.keccak_256.array(`short-answers-salt-${epoch}`)
  const {signature, recid} = secp256k1.ecdsaSign(
    new Uint8Array(hash),
    typeof key === 'string' ? hexToUint8Array(key) : new Uint8Array(key)
  )

  return sha3.sha3_256.array([...signature, recid])
}

export function serializeAnswers(hashesInOrder, answers) {
  const orderedAnswers = hashesInOrder.map(h => {
    const item = answers.find(x => x.hash === h)
    if (!item) {
      return {answer: 0, wrongWords: false}
    }
    return {answer: item.answer, wrongWords: item.wrongWords}
  })

  const res = orderedAnswers.reduce((cum, current, idx) => {
    // left
    if (current.answer === 1) {
      return cum.setn(idx, true)
    }
    // right
    if (current.answer === 2) {
      return cum.setn(idx + orderedAnswers.length, true)
    }
    // wrong words
    if (current.wrongWords) {
      return cum.setn(idx + orderedAnswers.length * 3, true)
    }
    return cum
  }, new BN(0))

  return res.toArray('be')
}

export function decryptMessage(key, message) {
  return eciesjs.decrypt(key, message)
}

export function generateFlipKey(isPublic, epoch, key) {
  const seedStart = isPublic
    ? 'flip-key-for-epoch-'
    : 'flip-private-key-for-epoch-'

  const hash = sha3.keccak_256.array(seedStart + epoch.toString())

  const {signature, recid} = secp256k1.ecdsaSign(
    new Uint8Array(hash),
    typeof key === 'string' ? hexToUint8Array(key) : new Uint8Array(key)
  )
  const result = generateKeyFromSeed([...signature, recid])

  return result
}

function generateKeyFromSeed(seed) {
  const size = ec.n.bitLength() / 8 + 8
  const b = seed.slice(0, size)

  let k = new BN(b)
  const n = ec.n.sub(new BN(1))
  k = k.mod(n)
  k = k.add(new BN(1))
  return k.toArray()
}
