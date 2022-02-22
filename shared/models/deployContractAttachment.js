import {toBuffer} from '../utils/buffers'
import messages from './proto/models_pb'

export class DeployContractAttachment {
  constructor(codeHash, args, clientType) {
    this.codeHash = codeHash
    this.args = args
    this.clientType = clientType
  }

  fromBytes(bytes) {
    const protoAttachment = messages.ProtoDeployContractAttachment.deserializeBinary(
      bytes
    )

    this.codeHash = protoAttachment.getCodehash()
    this.args = protoAttachment.getArgsList()
    this.clientType = protoAttachment.getClienttype()

    return this
  }

  toBytes() {
    const data = new messages.ProtoDeployContractAttachment()
    data.setCodehash(
      new Uint8Array(
        typeof this.codeHash === 'string'
          ? toBuffer(this.codeHash)
          : this.codeHash
      )
    )
    for (let i = 0; i < this.args.length; i += 1) {
      data.addArgs(new Uint8Array(this.args[i]))
    }
    data.setClienttype(this.clientType)
    return data.serializeBinary()
  }
}
