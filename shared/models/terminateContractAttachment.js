import messages from './proto/models_pb'

export class TerminateContractAttachment {
  constructor(args) {
    this.args = args
  }

  fromBytes(bytes) {
    const protoAttachment = messages.ProtoTerminateContractAttachment.deserializeBinary(
      bytes
    )

    this.args = protoAttachment.getArgsList()

    return this
  }

  toBytes() {
    const data = new messages.ProtoTerminateContractAttachment()
    for (let i = 0; i < this.args.length; i += 1) {
      data.addArgs(new Uint8Array(this.args[i]))
    }
    return data.serializeBinary()
  }
}
