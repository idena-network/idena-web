import messages from './proto/models_pb'

export class FlipSubmitAttachment {
  constructor(cid, pair) {
    this.cid = cid
    this.pair = pair
  }

  toBytes() {
    const data = new messages.ProtoFlipSubmitAttachment()
    data.setCid(new Uint8Array(this.cid))
    data.setPair(this.pair)
    return data.serializeBinary()
  }
}
