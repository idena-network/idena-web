import messages from './proto/models_pb'

export class ShortAnswerAttachment {
  constructor(rnd, answers) {
    this.rnd = rnd
    this.answers = answers
  }

  toBytes() {
    const data = new messages.ProtoShortAnswerAttachment()
    data.setAnswers(new Uint8Array(this.answers))
    data.setRnd(this.rnd)
    return data.serializeBinary()
  }
}
