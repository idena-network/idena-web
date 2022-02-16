import messages from './proto/models_pb'

export class CallContractAttachment {
  constructor(method, args, clientType) {
    this.method = method
    this.args = args
    this.clientType = clientType
  }

  fromBytes(bytes) {
    const protoAttachment = messages.ProtoCallContractAttachment.deserializeBinary(
      bytes
    )

    this.method = protoAttachment.getMethod()
    this.args = protoAttachment.getArgsList()
    this.clientType = protoAttachment.getClienttype()

    return this
  }

  toBytes() {
    const data = new messages.ProtoCallContractAttachment()
    data.setMethod(this.method)
    for (let i = 0; i < this.args.length; i += 1) {
      data.addArgs(new Uint8Array(this.args[i]))
    }
    data.setClienttype(this.clientType)
    return data.serializeBinary()
  }
}
