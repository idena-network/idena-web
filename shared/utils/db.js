import Dexie from 'dexie'

const db = new Dexie('IdenaStore')
db.version(1).stores({flips: '&hash,epoch'})

export default db
