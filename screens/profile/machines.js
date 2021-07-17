import {assign, createMachine} from 'xstate'
import {getRawTx, sendRawTx} from '../../shared/api'
import {HASH_IN_MEMPOOL} from '../../shared/hooks/use-tx'
import {Transaction} from '../../shared/models/transaction'
import {NodeType, TxType} from '../../shared/types'
import {toHexString} from '../../shared/utils/buffers'
import {privateKeyToAddress} from '../../shared/utils/crypto'
import {callRpc} from '../../shared/utils/utils'
import {OnlineStatusAttachment} from '../../shared/models/onlineStatusAttachment'

export const activateMiningMachine = createMachine({
  id: 'mining',
  initial: 'idle',
  context: {
    mode: NodeType.Miner,
  },
  states: {
    idle: {
      on: {
        SHOW: 'showing',
      },
    },
    showing: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            CHANGE_MODE: {
              actions: [
                assign({
                  mode: (_, {mode}) => mode,
                }),
              ],
            },
            ACTIVATE: 'activating',
            DEACTIVATE: 'deactivating',
          },
        },
        activating: {
          invoke: {
            src: ({privateKey}, {delegatee}) => delegate(delegatee, privateKey),
            onDone: {
              target: 'mining',
              actions: [
                assign({
                  hash: (_, {data}) => data,
                }),
                'waitIdentityUpdate',
              ],
            },
            onError: {actions: ['onError']},
          },
        },
        deactivating: {
          invoke: {
            src: ({privateKey}, {mode}) =>
              mode === NodeType.Delegator
                ? undelegate(privateKey)
                : becomeOffline(privateKey),
            onDone: {
              target: 'mining',
              actions: [
                assign({
                  hash: (_, {data}) => data,
                }),
                'waitIdentityUpdate',
              ],
            },
            onError: {actions: ['onError']},
          },
        },
        mining: {
          invoke: {
            src: ({hash}) => cb => {
              let timeoutId

              const fetchStatus = async () => {
                try {
                  const result = await callRpc('bcn_transaction', hash)
                  if (result.blockHash !== HASH_IN_MEMPOOL) {
                    cb({type: 'MINED'})
                  } else {
                    timeoutId = setTimeout(fetchStatus, 10 * 1000)
                  }
                } catch (error) {
                  console.error('Error retrieving tx', hash)
                }
              }

              timeoutId = setTimeout(fetchStatus, 10 * 1000)

              return () => {
                clearTimeout(timeoutId)
              }
            },
          },
          on: {
            MINED: {
              target: '#mining.idle',
              actions: ['forceIdentityUpdate'],
            },
          },
        },
      },
      on: {
        CANCEL: 'idle',
      },
    },
  },
})

async function delegate(to, privateKey) {
  const rawTx = await getRawTx(
    TxType.DelegateTx,
    privateKeyToAddress(privateKey),
    to
  )

  const tx = new Transaction().fromHex(rawTx)
  tx.sign(privateKey)

  const hex = tx.toHex()

  return sendRawTx(`0x${hex}`)
}

async function undelegate(privateKey) {
  const rawTx = await getRawTx(
    TxType.UndelegateTx,
    privateKeyToAddress(privateKey)
  )

  const tx = new Transaction().fromHex(rawTx)
  tx.sign(privateKey)

  const hex = tx.toHex()

  return sendRawTx(`0x${hex}`)
}

async function becomeOffline(privateKey) {
  const attachment = new OnlineStatusAttachment(false)

  const rawTx = await getRawTx(
    TxType.OnlineStatusTx,
    privateKeyToAddress(privateKey),
    null,
    0,
    0,
    toHexString(attachment.toBytes(), true)
  )

  const tx = new Transaction().fromHex(rawTx)
  tx.sign(privateKey)

  const hex = tx.toHex()

  return sendRawTx(`0x${hex}`)
}
