import {toHexString} from '../utils/buffers'
import messages from './proto/models_pb'

export class AdKey {
  constructor({language, age, os, stake}) {
    this.language = language
    this.age = age
    this.os = os
    this.stake = stake
  }

  toBytes() {
    const data = new messages.ProtoAd()

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
