import faunadb from 'faunadb'

export const faunaClient = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET,
})
