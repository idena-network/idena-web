import Dexie from 'dexie'

const db = new Dexie('IdenaStore')
db.version(1).stores({flips: '&hash,epoch'})
db.version(1).stores({ownFlips: '&id,epoch'})

export default db
