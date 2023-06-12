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
import { errors } from 'celebrate'
import cors from 'cors'
import express from 'express'
import promBundle from 'express-prom-bundle'
import morgan from 'morgan'

import { configurePromClientRegistry } from './PromClientRegistryConfig'
import { routes } from './routes'

const metricsMiddleware = promBundle({
  promClient: { collectDefaultMetrics: {} },
})

export const app = express()
  // log requests
  .use(morgan('combined'))

  // cors
  .use(cors())

  // routes
  .use('/api/v2', routes)

  .use(metricsMiddleware)
  // root: health check
  .get('/', (req, res) => {
    res.json({ uptime: process.uptime() })
  })

  // not found handler
  .use((req, res) => {
    res.status(404)
  })

  // celebrate error handler
  .use(errors())

configurePromClientRegistry()
