import log from 'logzio-nodejs'

const logger = log.createLogger({
  token: process.env.LOGS_TOKEN,
  host: 'listener-uk.logz.io',
  protocol: 'https',
  port: '8071',
  type: 'IdenaWeb',
})

export default (req, res) => {
  logger.log(req.body)
  logger.sendAndClose()
  res.status(200).end()
}
