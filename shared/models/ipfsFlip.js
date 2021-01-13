import {toHexString} from '../utils/buffers'
import messages from './proto/models_pb'

export class IpfsFlip {
  constructor(pubKey, publicPart, privatePart) {
    this.pubKey = pubKey
    this.publicPart = publicPart
    this.privatePart = privatePart
  }

  toBytes() {
    const data = new messages.ProtoIpfsFlip()
    data.setPubkey(new Uint8Array(this.pubKey))
    data.setPublicpart(new Uint8Array(this.publicPart))
    data.setPrivatepart(new Uint8Array(this.privatePart))
    return data.serializeBinary()
  }

  toHex() {
    return toHexString(this.toBytes(), true)
  }
}
