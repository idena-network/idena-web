import {getRawTx, sendRawTx} from '.'
import {Transaction} from '../models/transaction'
import {privateKeyToAddress} from '../utils/crypto'

export async function sendDna(privateKey, to, amount, maxFee) {
  const rawTx = await getRawTx(
    0,
    privateKeyToAddress(privateKey),
    to,
    amount,
    maxFee
  )

  const tx = new Transaction().fromHex(rawTx)
  tx.sign(privateKey)

  return sendRawTx(tx.toHex(true))
}
