import messages from './proto/models_pb'

export class ShortAnswerAttachment {
  constructor(rnd, answers, clientType) {
    this.rnd = rnd
    this.answers = answers
    this.clientType = clientType
  }

  toBytes() {
    const data = new messages.ProtoShortAnswerAttachment()
    data.setAnswers(new Uint8Array(this.answers))
    data.setRnd(this.rnd)
    data.setClienttype(this.clientType)
    return data.serializeBinary()
  }
}
