import messages from './proto/models_pb'

export class LongAnswerAttachment {
  constructor(answers, proof, flipKey, salt) {
    this.answers = answers
    this.proof = proof
    this.flipKey = flipKey
    this.salt = salt
  }

  toBytes() {
    const data = new messages.ProtoLongAnswerAttachment()
    data.setAnswers(new Uint8Array(this.answers))
    data.setProof(new Uint8Array(this.proof))
    data.setKey(new Uint8Array(this.flipKey))
    data.setSalt(new Uint8Array(this.salt))
    return data.serializeBinary()
  }
}
