import messages from './proto/models_pb'

export class FlipDeleteAttachment {
  constructor(cid) {
    this.cid = cid
  }

  toBytes() {
    const data = new messages.ProtoDeleteFlipAttachment()
    data.setCid(new Uint8Array(this.cid))
    return data.serializeBinary()
  }
}
