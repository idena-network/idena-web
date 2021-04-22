import {encode} from 'rlp'
import axios from 'axios'
import Jimp from 'jimp'
import CID from 'cids'
import {loadPersistentStateValue, persistItem} from '../../shared/utils/persist'
import {FlipType} from '../../shared/types'
import {areSame, areEual} from '../../shared/utils/arr'
import {getRawTx, submitRawFlip} from '../../shared/api'
import {signNonce} from '../../shared/utils/dna-link'
import {
  encryptFlipData,
  privateKeyToAddress,
  privateKeyToPublicKey,
} from '../../shared/utils/crypto'
import {IpfsFlip} from '../../shared/models/ipfsFlip'
import {getCid} from '../../shared/api/ipfs'
import {FlipSubmitAttachment} from '../../shared/models/flipSubmitAttachment'
import {hexToUint8Array, toHexString} from '../../shared/utils/buffers'
import {Transaction} from '../../shared/models/transaction'
import db from '../../shared/utils/db'

export const FLIP_LENGTH = 4
export const DEFAULT_FLIP_ORDER = [0, 1, 2, 3]

export function getRandomKeywordPair() {
  function getRandomInt(min, max) {
    // eslint-disable-next-line no-param-reassign
    min = Math.ceil(min)
    // eslint-disable-next-line no-param-reassign
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min)) + min
  }

  return {id: 0, words: [getRandomInt(0, 3407), getRandomInt(0, 3407)]}
}

export function isPendingKeywordPair(flips, id) {
  return flips.find(
    ({type, keywordPairId}) =>
      type === FlipType.Publishing && keywordPairId === id
  )
}

export function didArchiveFlips(epoch) {
  const persistedState = loadPersistentStateValue('flipArchive', epoch)
  if (persistedState) return persistedState.archived
  return false
}

export async function archiveFlips() {
  const data = await db.table('ownFlips').toArray()

  for (const flip of data) {
    if (flip.type === FlipType.Archived) {
      await db.table('ownFlips').delete(flip.id)
    } else {
      const newFlip = {...flip, type: FlipType.Archived}
      await createOrUpdateFlip(newFlip)
    }
  }
}

export function markFlipsArchived(epoch) {
  const persistedState = loadPersistentStateValue('flipArchive', epoch)
  if (persistedState && persistedState.archived) return
  persistItem('flipArchive', epoch, {
    archived: true,
    archivedAt: new Date().toISOString(),
  })
}

const perm = arr => {
  const ret = []
  for (let i = 0; i < arr.length; i += 1) {
    const rest = perm(arr.slice(0, i).concat(arr.slice(i + 1)))
    if (!rest.length) {
      ret.push([arr[i]])
    } else {
      for (let j = 0; j < rest.length; j += 1) {
        ret.push([arr[i]].concat(rest[j]))
      }
    }
  }
  return ret
}

const randomNumber = () => {
  const buf = new Uint32Array(1)
  window.crypto.getRandomValues(buf)
  return buf[0]
}

const randomPerm = arr => {
  const output = perm(arr)
  return output[randomNumber() % output.length]
}

function shufflePics(pics, shuffledOrder) {
  const seed = randomPerm(DEFAULT_FLIP_ORDER)
  const newPics = []
  const firstOrder = new Array(FLIP_LENGTH)

  seed.forEach((value, idx) => {
    newPics.push(pics[value])
    firstOrder[value] = idx
  })

  const secondOrder = shuffledOrder.map(value => firstOrder[value])

  return {
    pics: newPics,
    orders:
      randomNumber() % 2 === 0
        ? [firstOrder, secondOrder]
        : [secondOrder, firstOrder],
  }
}

export function flipToHex(pics, order) {
  const shuffled = shufflePics(pics, order)

  const publicRlp = encode([
    shuffled.pics
      .slice(0, 2)
      .map(src =>
        Uint8Array.from(atob(src.split(',')[1]), c => c.charCodeAt(0))
      ),
  ])

  const privateRlp = encode([
    shuffled.pics
      .slice(2)
      .map(src =>
        Uint8Array.from(atob(src.split(',')[1]), c => c.charCodeAt(0))
      ),
    shuffled.orders,
  ])
  return [publicRlp, privateRlp].map(x => `0x${x.toString('hex')}`)
}

export function updateFlipType(flips, {id, type}) {
  return flips.map(flip =>
    flip.id === id
      ? {
          ...flip,
          type,
          ref: flip.ref,
        }
      : flip
  )
}

export async function publishFlip({
  keywordPairId,
  images,
  originalOrder,
  order,
  orderPermutations,
  privateKey,
  epoch,
}) {
  if (images.some(x => !x)) throw new Error('You must use 4 images for a flip')

  const flips = await db.table('ownFlips').toArray()

  if (
    flips.some(
      flip =>
        flip.type === FlipType.Published &&
        flip.images &&
        areSame(flip.images, images)
    )
  )
    throw new Error('You already submitted this flip')

  if (areEual(order, originalOrder))
    throw new Error('You must shuffle flip before submit')

  const compressedImages = await Promise.all(
    images.map(image =>
      Jimp.read(image).then(raw =>
        raw
          .resize(240, 180)
          .quality(60) // jpeg quality
          .getBase64Async('image/jpeg')
      )
    )
  )

  const [publicHex, privateHex] = flipToHex(
    originalOrder.map(num => compressedImages[num]),
    orderPermutations
  )

  if (publicHex.length + privateHex.length > 2 * 1024 * 1024)
    throw new Error('Flip is too large')

  const {encryptedPublicData, encryptedPrivateData} = encryptFlipData(
    publicHex,
    privateHex,
    privateKey,
    epoch
  )

  const ipfsFlip = new IpfsFlip(
    hexToUint8Array(privateKeyToPublicKey(privateKey)),
    encryptedPublicData,
    encryptedPrivateData
  )

  const cidString = await getCid(ipfsFlip.toHex())
  const cid = new CID(cidString)

  const attachment = new FlipSubmitAttachment(
    cid.bytes,
    keywordPairId
  ).toBytes()

  const rawTx = await getRawTx(
    4,
    privateKeyToAddress(privateKey),
    null,
    0,
    0,
    toHexString(attachment, true)
  )
  const tx = new Transaction().fromHex(rawTx)
  try {
    tx.sign(privateKey)
  } catch (e) {
    throw new Error(
      `Cannot sign flip transaction, keySize: [${
        privateKey.length
      }], keyType: [${typeof privateKey}], err: [${e.message}]`
    )
  }
  const hex = tx.toHex()

  const {result, error} = await submitRawFlip(
    toHexString(encryptedPublicData, true),
    toHexString(encryptedPrivateData, true),
    `0x${hex}`
  )

  if (error) {
    let {message} = error

    if (message.includes('candidate'))
      message = `It's not allowed to submit flips with your identity status`

    if (message.includes('ceremony'))
      message = `Can not submit flip during the validation session`

    throw new Error(message)
  }

  return {...result, hash: cidString}
}

export function formatKeywords(keywords) {
  return keywords
    .map(({name: [f, ...rest]}) => f.toUpperCase() + rest.join(''))
    .join(' / ')
}

export async function fetchKeywordTranslations(ids, locale) {
  return (
    await Promise.all(
      ids.map(async id =>
        (
          await fetch(
            `https://translation.idena.io/word/${id}/language/${locale}/translations`
          )
        ).json()
      )
    )
  ).map(({translations}) =>
    (translations || []).map(
      ({
        id,
        name,
        description: desc,
        confirmed,
        upVotes: ups,
        downVotes: downs,
      }) => ({
        id,
        name,
        desc,
        confirmed,
        ups,
        downs,
        score: ups - downs,
      })
    )
  )
}

export async function fetchConfirmedKeywordTranslations(ids, locale) {
  return (
    await Promise.all(
      ids.map(async id =>
        (
          await fetch(
            `https://translation.idena.io/word/${id}/language/${locale}/confirmed-translation`
          )
        ).json()
      )
    )
  ).map(({translation}) => translation)
}

export async function voteForKeywordTranslation({id, up}) {
  const timestamp = new Date().toISOString()
  const signature = await signNonce(id.concat(up).concat(timestamp))

  const {
    data: {resCode, upVotes, downVotes, error},
  } = await axios.post(`https://translation.idena.io/vote`, {
    signature,
    timestamp,
    translationId: id,
    up,
  })

  if (resCode > 0 && error) throw new Error(error)

  return {id, ups: upVotes - downVotes}
}

export async function suggestKeywordTranslation({
  wordId,
  name,
  desc,
  locale = 'en',
}) {
  const timestamp = new Date().toISOString()

  const signature = await signNonce(
    wordId
      .toString()
      .concat(locale)
      .concat(name)
      .concat(desc)
      .concat(timestamp)
  )

  const {
    data: {resCode, translationId, error},
  } = await axios.post(`https://translation.idena.io/translation`, {
    word: wordId,
    name,
    description: desc,
    language: locale,
    signature,
    timestamp,
  })

  if (resCode > 0 && error) throw new Error(error)

  return {
    id: translationId,
    wordId,
    name,
    desc,
  }
}

export async function createOrUpdateFlip({
  id,
  keywordPairId,
  originalOrder,
  order,
  orderPermutations,
  images,
  keywords,
  type,
  createdAt,
  modifiedAt,
  hash,
  txHash,
}) {
  const nextFlip = {
    id,
    keywordPairId,
    originalOrder,
    order,
    orderPermutations,
    images,
    keywords,
    type,
    createdAt,
    modifiedAt,
    hash,
    txHash,
  }

  return db
    .table('ownFlips')
    .put(nextFlip)
    .then(dbKey => console.log('updated draft', 'key', dbKey))
}
