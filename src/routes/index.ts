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
import { NextFunction, Request, Response, Router } from 'express'

import { isStatusCoded } from '../lib/errors'
import { swaggerSpec } from '../lib/swagger-spec'
import { exportBibliography } from './export-bibliography'
import { exportBundleJATS } from './export-bundle-jats'
import { exportBundleLiteratum } from './export-bundle-literatum'
import { exportHtml } from './export-html'
import { exportJATS } from './export-jats'
import { exportPDF } from './export-pdf'
import { importJATS } from './import-jats'
import { pdfJobResult } from './pdf-job-result'
import { pdfJobStatus } from './pdf-job-status'
import { validateTemplateId } from './validate-template-id'

export const routes = Router()
  // importers
  .use('/', importJATS)

  // exporters
  .use(
    '/',
    exportPDF,
    exportHtml,
    exportBundleJATS,
    exportBibliography,
    exportBundleLiteratum,
    exportJATS
  )

  // Indesign
  .use('/', pdfJobResult, pdfJobStatus)

  // validators
  .use('/', validateTemplateId)

  // OpenAPI description for machines
  .get('/docs.json', (req, res) => res.json(swaggerSpec))

  // middleware for errors to wrap status coded errors
  .use((error: Error, _req: Request, res: Response, next: NextFunction) => {
    if (isStatusCoded(error)) {
      res
        .status(error.statusCode)
        .json({ error: JSON.stringify(error), message: error.message })
    }
    next(error)
  })
