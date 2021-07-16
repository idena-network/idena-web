import nanoid from 'nanoid'
import db from '../../shared/utils/db'

export function getInvites() {
  return db.invites.toArray()
}

export async function addInvite(invite) {
  const id = nanoid()
  await db.invites.put({id, ...invite})
  return id
}

export function updateInvite(id, invite) {
  return db.invites.put({id, ...invite})
}

export function getActivationTx() {
  return localStorage.getItem('activationTx')
}

export function setActivationTx(hash) {
  localStorage.setItem('activationTx', hash)
}

export function clearActivationTx() {
  localStorage.removeItem('activationTx')
}
