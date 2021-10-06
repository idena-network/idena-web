import Dexie from 'dexie'

const db = new Dexie('IdenaStore')

db.version(4).stores({
  flips: '&hash,epoch',
  ownFlips: '&id,epoch',
  invites: '&id,address,firstName,lastName',
  logs: '++id,epoch',
})

export default db
