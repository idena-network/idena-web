import {useMachine} from '@xstate/react'
import {useState} from 'react'
import {assign, createMachine} from 'xstate'
import {
  activateKey,
  getAvailableProviders,
  getRawTx,
  sendRawTx,
} from '../../shared/api'
import useApikeyPurchasing from '../../shared/hooks/use-apikey-purchasing'
import {useFailToast} from '../../shared/hooks/use-toast'
import useTx from '../../shared/hooks/use-tx'
import {Transaction} from '../../shared/models/transaction'
import {useAuthState} from '../../shared/providers/auth-context'
import {useIdentity} from '../../shared/providers/identity-context'
import {IdentityStatus} from '../../shared/types'
import {sendActivateInvitation} from '../../shared/utils/analytics'
import {
  privateKeyToAddress,
  privateKeyToPublicKey,
} from '../../shared/utils/crypto'
import {validateInvitationCode} from '../../shared/utils/utils'

export function useIdenaBot() {
  const [current, send] = useMachine(
    createMachine({
      context: {
        connected: undefined,
      },
      initial: 'loading',
      states: {
        loading: {
          invoke: {
            src: 'loadConnectionStatus',
          },
          on: {
            CONNECTED: 'connected',
            DISCONNECTED: 'disconnected',
          },
        },
        connected: {
          entry: [assign({connected: true}), 'persist'],
        },
        disconnected: {
          on: {CONNECT: 'connected'},
        },
      },
    }),
    {
      services: {
        loadConnectionStatus: () => cb => {
          try {
            cb(
              JSON.parse(localStorage.getItem('connectIdenaBot'))
                ? 'CONNECTED'
                : 'DISCONNECTED'
            )
          } catch (e) {
            console.error(e)
            cb('DISCONNECTED')
          }
        },
      },
      actions: {
        persist: ({connected}) => {
          localStorage.setItem('connectIdenaBot', connected)
        },
      },
    }
  )

  return [current.context.connected, () => send('CONNECT')]
}

export function useInviteActivation() {
  const failToast = useFailToast()

  const [{state}, {waitStateUpdate}] = useIdentity()
  const {coinbase, privateKey} = useAuthState()
  const [submitting, setSubmitting] = useState(false)

  const [{mining}, setHash] = useTx()

  const {isPurchasing, needToPurchase, savePurchase} = useApikeyPurchasing()

  const sendActivateInviteTx = async code => {
    setSubmitting(true)

    try {
      const trimmedCode = code?.trim()

      if (trimmedCode) {
        if (!validateInvitationCode(trimmedCode)) throw new Error()
      }

      const from = trimmedCode
        ? privateKeyToAddress(trimmedCode)
        : privateKeyToAddress(privateKey)

      const rawTx = await getRawTx(
        1,
        from,
        coinbase,
        0,
        0,
        privateKeyToPublicKey(privateKey)
      )

      const tx = new Transaction().fromHex(rawTx)
      tx.sign(trimmedCode || privateKey)

      const hex = tx.toHex()

      if (needToPurchase) {
        const providers = await getAvailableProviders()

        const result = await activateKey(coinbase, `0x${hex}`, providers)
        savePurchase(result.id, result.provider)
      } else {
        const result = await sendRawTx(`0x${hex}`)
        setHash(result)

        // need to wait identity state update manually, because nothing changes in memory
        waitStateUpdate()
      }
      sendActivateInvitation(coinbase)
    } catch (e) {
      failToast(
        `Failed to activate invite: ${
          e.response ? e.response.data : 'invitation is invalid'
        }`
      )
    } finally {
      setSubmitting(false)
    }
  }

  const waiting = submitting || isPurchasing || mining

  return [
    {isSuccess: state === IdentityStatus.Candidate, isMining: waiting},
    {activateInvite: sendActivateInviteTx},
  ]
}
