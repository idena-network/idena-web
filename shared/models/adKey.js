import {stripHexPrefix, toHexString} from '../utils/buffers'
import root from './proto/models_pb'

export class AdKey {
  constructor({language, age, os, stake}) {
    this.language = language
    this.age = age
    this.os = os
    this.stake = stake
  }

  static fromBytes = bytes => {
    const protoAdKey = root.ProtoAdKey.deserializeBinary(bytes)
    return new AdKey(protoAdKey.toObject())
  }

  static fromHex = hex =>
    AdKey.fromBytes(Buffer.from(stripHexPrefix(hex), 'hex'))

  toBytes() {
    const data = new root.ProtoAdKey()

    data.setLanguage(this.language)
    data.setAge(this.age)
    data.setOs(this.os)
    data.setStake(this.stake)

    return data.serializeBinary()
  }

  toHex() {
    return toHexString(this.toBytes(), true)
  }
}
