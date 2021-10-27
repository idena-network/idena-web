/* eslint-disable react/prop-types */
import React, {useEffect} from 'react'
import nanoid from 'nanoid'
import {useInterval} from '../hooks/use-interval'
import {HASH_IN_MEMPOOL, callRpc, lowerCase} from '../utils/utils'
import {useIdentity} from './identity-context'
import {IdentityStatus, TxType} from '../types'
import * as db from '../../screens/contacts/db'
import {fetchIdentity, getRawTx, sendRawTx} from '../api'
import {generatePrivateKey, privateKeyToAddress} from '../utils/crypto'
import {Transaction} from '../models/transaction'
import {toHexString} from '../utils/buffers'
import {canKill} from '../../screens/contacts/utils'

const InviteStateContext = React.createContext()
const InviteDispatchContext = React.createContext()

export function InviteProvider({children}) {
  const [invites, setInvites] = React.useState([])

  const [{invitees}] = useIdentity()

  useEffect(() => {
    let ignore = false

    async function fetchData() {
      const savedInvites = await db.getInvites()
      const txs = (
        await Promise.all(
          savedInvites
            .filter(({activated}) => !activated)
            .map(({hash}) =>
              callRpc('bcn_transaction', hash)
                .then(tx => ({
                  hash,
                  mining: tx?.blockHash === HASH_IN_MEMPOOL,
                }))
                .catch(() => null)
            )
        )
      ).filter(Boolean)

      const terminateTxs = await Promise.all(
        savedInvites
          .filter(({terminateHash}) => terminateHash)
          .map(({terminateHash}) =>
            callRpc('bcn_transaction', terminateHash).then(tx => ({
              terminateHash,
              mining: tx?.blockHash === HASH_IN_MEMPOOL,
            }))
          )
      )

      const invitesIdentities = await Promise.all(
        savedInvites.map(({receiver}) => fetchIdentity(receiver))
      )

      const inviteeIdentities = await Promise.all(
        (invitees ?? []).map(({Address}) => fetchIdentity(Address))
      )

      const nextInvites = await Promise.all(
        savedInvites.map(async invite => {
          // find out mining invite status
          const tx = txs.find(({hash}) => hash === invite.hash)
          const terminateTx = terminateTxs.find(
            ({terminateHash}) => terminateHash === invite.terminateHash
          )

          // find invitee to kill
          const invitee = invitees?.find(({TxHash}) => TxHash === invite.hash)

          // find all identities/invites
          const invitedIdentity =
            inviteeIdentities?.find(
              identity =>
                lowerCase(identity.address) === lowerCase(invitee?.Address)
            ) ||
            invitesIdentities.find(
              identity =>
                lowerCase(identity.address) === lowerCase(invite.receiver)
            )

          // becomes activated once invitee is found
          const isNewInviteActivated = !!invitee

          const nextInvite = {
            ...invite,
            activated: invite.activated || isNewInviteActivated,
            canKill: canKill(invitee, invitedIdentity),
            receiver: isNewInviteActivated ? invitee.Address : invite.receiver,
          }

          if (isNewInviteActivated) {
            // save changes once invitee is found
            await db.updateInvite(invite.id, nextInvite)
          }

          return {
            ...nextInvite,
            mining: tx?.mining,
            terminating: terminateTx?.mining,
            identity: invitedIdentity,
          }
        })
      )

      if (!ignore) {
        setInvites(nextInvites)
      }
    }

    fetchData().catch(e => {
      console.error('An error occured while fetching identity', e.message)
    })

    return () => {
      ignore = true
    }
  }, [invitees])

  useInterval(
    async () => {
      const miningInvites = invites.filter(({mining}) => mining)

      const txs = await Promise.all(
        miningInvites.map(({hash}) =>
          callRpc('bcn_transaction', hash)
            .then(tx => ({
              hash,
              mining: tx?.blockHash === HASH_IN_MEMPOOL,
            }))
            .catch(() => null)
        )
      )

      const identities = await Promise.all(
        miningInvites.map(async invite => {
          const invitedIdentity = await callRpc('dna_identity', invite.receiver)

          return {
            hash: invite.hash,
            identity: invitedIdentity,
          }
        })
      )

      setInvites(
        invites.map(invite => {
          const tx = txs.find(x => x.hash === invite.hash)
          const identity = identities.find(x => x.hash === invite.hash)
          return {
            ...invite,
            ...tx,
            ...identity,
          }
        })
      )
    },
    invites.filter(({mining}) => mining).length ? 1000 * 10 : null
  )

  useInterval(
    async () => {
      const terminatingInvites = invites.filter(({terminating}) => terminating)

      const identities = await Promise.all(
        terminatingInvites.map(async invite =>
          callRpc('dna_identity', invite.receiver)
        )
      )

      setInvites(
        invites.map(invite => {
          if (!invite.terminating) {
            return invite
          }

          const termintingIdentity = identities.find(
            x => lowerCase(x.address) === lowerCase(invite.receiver)
          )

          const isTerminating =
            termintingIdentity?.state !== IdentityStatus.Undefined

          return {
            ...invite,
            identity: termintingIdentity,
            state: isTerminating
              ? IdentityStatus.Terminating
              : termintingIdentity?.state,
            terminating: isTerminating,
            canKill: false,
          }
        })
      )
    },
    invites.filter(({terminating}) => terminating).length ? 1000 * 10 : null
  )

  const addInvite = async ({
    from,
    to,
    privateKey,
    firstName = '',
    lastName = '',
  }) => {
    let invitePk
    let inviteAddress = to

    if (!inviteAddress) {
      invitePk = generatePrivateKey()
      inviteAddress = privateKeyToAddress(invitePk)
    }

    const rawTx = await getRawTx(2, from, inviteAddress)

    const tx = new Transaction().fromHex(rawTx)
    tx.sign(privateKey)

    const hash = await sendRawTx(`0x${tx.toHex()}`)

    const id = nanoid()

    const issuedInvite = {
      id,
      firstName,
      lastName,
      hash,
      receiver: inviteAddress,
      key: toHexString(invitePk ?? ''),
      activated: false,
      canKill: true,
    }

    await db.addInvite(issuedInvite)
    const invite = {...issuedInvite, mining: true}
    setInvites([...invites, invite])

    return invite
  }

  const updateInvite = async (id, firstName, lastName) => {
    const newFirstName = firstName || ''
    const newLastName = lastName || ''

    setInvites(
      invites.map(inv => {
        if (inv.id === id) {
          return {
            ...inv,
            firstName: newFirstName,
            lastName: newLastName,
          }
        }
        return inv
      })
    )

    await db.updateInvite(id, {firstName: newFirstName, lastName: newLastName})
  }

  const deleteInvite = async id => {
    setInvites(
      invites.map(currentInvite =>
        currentInvite.id === id
          ? {...currentInvite, deletedAt: Date.now()}
          : currentInvite
      )
    )
    await db.deleteInvite(id)
  }

  const killInvite = async (id, to, privateKey) => {
    const rawTx = await getRawTx(
      TxType.KillInviteeTx,
      privateKeyToAddress(privateKey),
      to
    )

    const tx = new Transaction().fromHex(rawTx)
    tx.sign(privateKey)

    const result = await sendRawTx(`0x${tx.toHex()}`)

    setInvites(
      // eslint-disable-next-line no-shadow
      invites.map(invite =>
        invite.id === id
          ? {
              ...invite,
              terminating: true,
              state: IdentityStatus.Terminating,
              canKill: false,
            }
          : invite
      )
    )
    const invite = {id, terminateHash: result, terminatedAt: Date.now()}
    await db.updateInvite(id, invite)
    return result
  }

  const recoverInvite = async id => {
    const invite = invites.find(x => x.id === id)

    if (invite) {
      setInvites(
        invites.map(inv => {
          if (inv.id === id) {
            return {
              ...inv,
              deletedAt: null,
            }
          }
          return inv
        })
      )

      await db.addInvite({...invite, deletedAt: null, identity: null})
    }
  }

  return (
    <InviteStateContext.Provider value={{invites}}>
      <InviteDispatchContext.Provider
        value={{
          addInvite,
          updateInvite,
          deleteInvite,
          recoverInvite,
          killInvite,
        }}
      >
        {children}
      </InviteDispatchContext.Provider>
    </InviteStateContext.Provider>
  )
}

export function useInviteState() {
  const context = React.useContext(InviteStateContext)
  if (context === undefined) {
    throw new Error('useInviteState must be used within a InviteProvider')
  }
  return context
}

export function useInviteDispatch() {
  const context = React.useContext(InviteDispatchContext)
  if (context === undefined) {
    throw new Error('useInviteDispatch must be used within a InviteProvider')
  }
  return context
}

export function useInvite() {
  return [useInviteState(), useInviteDispatch()]
}
