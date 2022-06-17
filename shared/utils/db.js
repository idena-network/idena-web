import Dexie from 'dexie'

const db = new Dexie('IdenaStore')

db.version(7).stores({
  flips: '&hash,epoch',
  ownFlips: '&id,epoch',
  invites: '&id,address,firstName,lastName',
  logs: '++id,epoch',
  votings: '&id',
  deferredVotes: '++id,type',
  ads: '&id,status,language,os,author',
})

db.version(8).stores({
  flips: '&hash,epoch',
  ownFlips: '&id,epoch',
  invites: '&id,address,firstName,lastName',
  logs: '++id,epoch',
  votings: '&id',
  deferredVotes: '++id,type',
  ads: '&id,status,language,os,author',
  adVotings: '&address,status,result',
})

export default db
