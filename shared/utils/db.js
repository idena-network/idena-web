import Dexie from 'dexie'

const db = new Dexie('IdenaStore')
db.version(3).stores({flips: '&hash,epoch', ownFlips: '&id,epoch'})

export default db
