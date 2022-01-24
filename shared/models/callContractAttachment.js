import messages from './proto/models_pb'

export class CallContractAttachment {
  constructor(method, args) {
    this.method = method
    this.args = args
  }

  fromBytes(bytes) {
    const protoAttachment = messages.ProtoCallContractAttachment.deserializeBinary(
      bytes
    )

    this.method = protoAttachment.getMethod()
    this.args = protoAttachment.getArgsList()

    return this
  }

  toBytes() {
    const data = new messages.ProtoCallContractAttachment()
    data.setMethod(this.method)
    for (let i = 0; i < this.args.length; i += 1) {
      data.addArgs(new Uint8Array(this.args[i]))
    }
    return data.serializeBinary()
  }
}
