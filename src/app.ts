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
import createError from 'http-errors'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'

import { defineGlobals } from './lib/define-globals'
import { logger } from './lib/logger'
import { swaggerSpec } from './lib/swagger-spec'
// import { buildPickerBundle } from './routes/build-picker-bundle'
import { buildSubmissionBundle } from './routes/build-submission-bundle'
import { convertReferencesAnyStyle } from './routes/convert-references-anystyle'
import { convertReferencesEdifix } from './routes/convert-references-edifix'
import { exportBibliography } from './routes/export-bibliography'
import { exportDocx } from './routes/export-docx'
import { exportEpub } from './routes/export-epub'
import { exportIcml } from './routes/export-icml'
import { exportLiteratumBundle } from './routes/export-literatum-bundle'
import { exportLiteratumDO } from './routes/export-literatum-do'
import { exportLiteratumEEO } from './routes/export-literatum-eeo'
import { exportPDF } from './routes/export-pdf'
import { importPDF } from './routes/import-pdf'
import { importWord } from './routes/import-word'
import { importWordArc } from './routes/import-word-arc'
import { importZip } from './routes/import-zip'

defineGlobals()

export const app = express()
  // log requests
  .use(morgan('combined', { stream: { write: logger.info.bind(logger) } }))

  // cors
  .use(cors())

  // importers
  .use('/', importWord, importWordArc, importZip, importPDF)

  // exporters
  .use(
    '/',
    exportPDF,
    exportDocx,
    exportEpub,
    exportIcml,
    exportBibliography,
    exportLiteratumBundle,
    exportLiteratumDO,
    exportLiteratumEEO
  )

  // builders
  .use(
    '/',
    buildSubmissionBundle
    // buildPickerBundle
  )

  // converters
  .use('/', convertReferencesAnyStyle, convertReferencesEdifix)

  // OpenAPI description for people
  .use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

  // OpenAPI description for machines
  .get('/docs.json', (req, res) => res.json(swaggerSpec))

  // root: health check
  .get('/', (req, res) => {
    res.json({ uptime: process.uptime() })
  })

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
