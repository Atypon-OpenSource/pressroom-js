/*!
 * © 2020 Atypon Systems LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
