import db from '../../shared/utils/db'

export function getInvites() {
  return db.invites.toArray()
}

export async function addInvite(invite) {
  return db.invites.put(invite)
}

export function updateInvite(id, invite) {
  return db.invites.update(id, invite)
}

export function deleteInvite(id) {
  return db.invites.delete(id)
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
