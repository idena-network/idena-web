import {createProxyMiddleware} from 'http-proxy-middleware'

const AVAILABLE_KEYS = JSON.parse(process.env.AVAILABLE_KEYS || '[]')

const proxy = createProxyMiddleware({
  changeOrigin: true,
  secure: false,
  target: process.env.NODE_URL,
  onProxyReq(proxyReq, req, res) {
    if (AVAILABLE_KEYS.indexOf(req.body.key) === -1) {
      proxyReq.destroy()
      res.status(403).send('API key is invalid')
      return
    }
    const data = JSON.stringify({...req.body, key: process.env.NODE_KEY})
    proxyReq.setHeader('Content-Length', Buffer.byteLength(data))
    proxyReq.write(data)
  },
})

export default proxy
