import pg from 'pg'

const {Pool} = pg

export function createPool() {
  return new Pool()
}
