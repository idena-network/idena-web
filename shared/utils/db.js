import Dexie from 'dexie'

const db = new Dexie('IdenaStore')

db.version(2).stores({
  flips: '&hash,epoch',
  ownFlips: '&id,epoch',
})

db.version(3).stores({
  flips: '&hash,epoch',
  ownFlips: '&id,epoch',
  invites: '&id,address,firstName,lastName',
})

export default db
