import messages from './proto/models_pb'

export class TerminateContractAttachment {
  constructor(args, clientType) {
    this.args = args
    this.clientType = clientType
  }

  fromBytes(bytes) {
    const protoAttachment = messages.ProtoTerminateContractAttachment.deserializeBinary(
      bytes
    )

    this.args = protoAttachment.getArgsList()
    this.clientType = protoAttachment.getClienttype()

    return this
  }

  toBytes() {
    const data = new messages.ProtoTerminateContractAttachment()
    for (let i = 0; i < this.args.length; i += 1) {
      data.addArgs(new Uint8Array(this.args[i]))
    }
    data.setClienttype(this.clientType)
    return data.serializeBinary()
  }
}
