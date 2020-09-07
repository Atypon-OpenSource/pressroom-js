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
import { Router } from 'express'
import swaggerUi from 'swagger-ui-express'

import { swaggerSpec } from '../lib/swagger-spec'
import { buildSubmissionBundle } from './build-submission-bundle'
import { convertReferencesAnyStyle } from './convert-references-anystyle'
import { convertReferencesEdifix } from './convert-references-edifix'
import { exportBibliography } from './export-bibliography'
import { exportDocx } from './export-docx'
import { exportEpub } from './export-epub'
import { exportHtml } from './export-html'
import { exportIcml } from './export-icml'
import { exportJats } from './export-jats'
import { exportLatex } from './export-latex'
import { exportLiteratumBundle } from './export-literatum-bundle'
import { exportLiteratumDO } from './export-literatum-do'
import { exportLiteratumEEO } from './export-literatum-eeo'
import { exportPDF } from './export-pdf'
import { importPDF } from './import-pdf'
import { importWord } from './import-word'
import { importWordArc } from './import-word-arc'
import { importZip } from './import-zip'

export const routes = Router()
  // importers
  .use('/', importPDF, importWord, importWordArc, importZip)

  // exporters
  .use(
    '/',
    exportPDF,
    exportDocx,
    exportEpub,
    exportHtml,
    exportIcml,
    exportJats,
    exportLatex,
    exportBibliography,
    exportLiteratumBundle,
    exportLiteratumDO,
    exportLiteratumEEO
  )

  // builders
  .use('/', buildSubmissionBundle)

  // converters
  .use('/', convertReferencesAnyStyle, convertReferencesEdifix)

  // OpenAPI description for people
  .use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

  // OpenAPI description for machines
  .get('/docs.json', (req, res) => res.json(swaggerSpec))
