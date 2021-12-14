import messages from './proto/models_pb'

export class DeployContractAttachment {
  constructor(codeHash, args) {
    this.codeHash = codeHash
    this.args = args
  }

  fromBytes(bytes) {
    const protoAttachment = messages.ProtoDeployContractAttachment.deserializeBinary(
      bytes
    )

    this.codeHash = protoAttachment.getCodehash()
    this.args = protoAttachment.getArgsList()

    return this
  }

  toBytes() {
    const data = new messages.ProtoDeployContractAttachment()
    data.setCodehash(new Uint8Array(this.codeHash))
    for (let i = 0; i < this.args.length; i += 1) {
      data.addArgs(new Uint8Array(this.args[i]))
    }
    return data.serializeBinary()
  }
}
