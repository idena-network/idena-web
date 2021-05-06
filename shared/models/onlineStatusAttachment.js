import messages from './proto/models_pb'

export class OnlineStatusAttachment {
  constructor(online) {
    this.online = online
  }

  toBytes() {
    const data = new messages.ProtoOnlineStatusAttachment()
    data.setOnline(!!this.online)
    return data.serializeBinary()
  }
}
