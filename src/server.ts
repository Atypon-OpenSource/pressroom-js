import errorhandler from 'errorhandler'

import app from './app'
import { logger } from './lib/logger'

if (process.env.NODE_ENV === 'development') {
  app.use(errorhandler())
}

const port = process.env.PORT ? Number(process.env.PORT) : 3005
const hostname = process.env.HOSTNAME || '0.0.0.0'

app.listen(port, hostname, () => {
  logger.info(`Listening on ${hostname}:${port}`)
})
