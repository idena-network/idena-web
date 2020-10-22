import {createProxyMiddleware} from 'http-proxy-middleware'

const AVAILABLE_KEYS = JSON.parse(process.env.AVAILABLE_KEYS || '[]')

const methods = [
  'dna_identity',
  'dna_ceremonyIntervals',
  'dna_epoch',
  'dna_isValidationReady',
  'dna_wordsSeed',
  'dna_getBalance',
  'flip_getRaw',
  'flip_getKeys',
  'flip_words',
  'flip_shortHashes',
  'flip_longHashes',
  'flip_privateEncryptionKeyCandidates',
  'flip_sendPrivateEncryptionKeysPackage',
  'flip_sendPublicEncryptionKey',
  'bcn_syncing',
  'bcn_getRawTx',
  'bcn_sendRawTx',
  'bcn_transaction',
]

export const config = {
  api: {
    externalResolver: true,
  },
}

const proxy = createProxyMiddleware({
  changeOrigin: true,
  secure: false,
  target: process.env.NODE_URL,
  onProxyReq(proxyReq, req, res) {
    const data = JSON.stringify({...req.body, key: process.env.NODE_KEY})
    proxyReq.setHeader('Content-Length', Buffer.byteLength(data))
    proxyReq.write(data)
  },
})

export default async (req, res) => {
  if (methods.indexOf(req.body.method) === -1) {
    res.status(403).send('method not available')
    return
  }
  if (AVAILABLE_KEYS.indexOf(req.body.key) === -1) {
    res.status(403).send('API key is invalid')
    return
  }
  return proxy(req, res)
}
