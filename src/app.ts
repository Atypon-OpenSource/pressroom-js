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
import createHttpError from 'http-errors'
import morgan from 'morgan'

import { defineGlobals } from './lib/define-globals'
import { errorResponder } from './lib/error-responder'
import { logger } from './lib/logger'
import { routes } from './routes'

defineGlobals()

export const app = express()
  // log requests
  .use(morgan('combined', { stream: { write: logger.info.bind(logger) } }))

  // cors
  .use(cors())

  // routes
  .use('/api/v2', routes)

  // root: health check
  .get('/', (req, res) => {
    res.json({ uptime: process.uptime() })
  })

  // not found handler
  .use((req, res, next) => {
    next(createHttpError(404))
  })

  // error logger
  .use(
    (
      error: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      logger.error(`${error.message}: ${error.stack}`)
      next(error)
    }
  )

  // celebrate error handler
  .use(errors())

  // error response
  .use(errorResponder)
