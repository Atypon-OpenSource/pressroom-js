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
import express from 'express'
import createError from 'http-errors'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'

import { defineGlobals } from './lib/define-globals'
import { logger } from './lib/logger'
import { swaggerSpec } from './lib/swagger-spec'
import { buildGatewayBundle } from './routes/build-gateway-bundle'
import { buildLiteratumBundle } from './routes/build-literatum-bundle'
// import { buildPickerBundle } from './routes/build-picker-bundle'
import { buildSubmissionBundle } from './routes/build-submission-bundle'
import { exportDocx } from './routes/export-docx'
import { exportEpub } from './routes/export-epub'
import { exportLiteratumDO } from './routes/export-literatum-do'
import { exportLiteratumJATS } from './routes/export-literatum-jats'
import { exportPDF } from './routes/export-pdf'
import { importWord } from './routes/import-word'
import { importWordArc } from './routes/import-word-arc'
import { importZip } from './routes/import-zip'

defineGlobals()

export default express()
  // log requests
  .use(morgan('combined', { stream: { write: logger.info.bind(logger) } }))

  // importers
  .use('/', importWord, importWordArc, importZip)

  // exporters
  .use(
    '/',
    exportPDF,
    exportDocx,
    exportEpub,
    exportLiteratumDO,
    exportLiteratumJATS
  )

  // builders
  .use(
    '/',
    buildSubmissionBundle,
    buildGatewayBundle,
    buildLiteratumBundle
    // buildPickerBundle
  )

  // OpenAPI description for people
  .use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

  // OpenAPI description for machines
  .use('/docs.json', (req, res) => res.json(swaggerSpec))

  // not found handler
  .use((req, res, next) => {
    next(createError(404))
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

  // JSON error response
  .use(
    (
      error: Error,
      req: express.Request,
      res: express.Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      next: express.NextFunction
    ) => {
      res.status(500).json({
        error: error.message,
      })
    }
  )
