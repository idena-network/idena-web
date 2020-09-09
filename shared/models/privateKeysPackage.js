import sha3 from 'js-sha3'
import secp256k1 from 'secp256k1'
import eciesjs from 'idena-eciesjs'
import messages from './proto/models_pb'
import {hexToUint8Array} from '../utils/buffers'

export default class PrivateKeysPackage {
  constructor(epoch, keysArray, publicFlipKey, privateFlipKey) {
    const protoKeys = new messages.ProtoFlipPrivateKeys()
    protoKeys.setKeysList(
      keysArray.map(candidate => eciesjs.encrypt(candidate, privateFlipKey))
    )
    const binary = protoKeys.serializeBinary()

    this.data = eciesjs.encrypt(
      secp256k1.publicKeyCreate(new Uint8Array(publicFlipKey)),
      binary
    )
    this.epoch = epoch
  }

  sign(key) {
    const data = new messages.ProtoPrivateFlipKeysPackage.Data()
    data.setPackage(this.data)
    data.setEpoch(this.epoch)

    const hash = sha3.keccak_256.array(data.serializeBinary())

    const {signature, recid} = secp256k1.ecdsaSign(
      new Uint8Array(hash),
      hexToUint8Array(key)
    )

    this.signature = Buffer.from([...signature, recid])

    return this
  }

  getData() {
    return this.data
  }

  getSignature() {
    return this.signature
  }

  getEpoch() {
    return this.epoch
  }
}
