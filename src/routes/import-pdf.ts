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
import {
  ContainedModel,
  parseTEIGROBIDArticle,
} from '@manuscripts/manuscript-transform'
import archiver from 'archiver'
import { Router } from 'express'
import getStream from 'get-stream'

import { authentication } from '../lib/authentication'
import { createJSON } from '../lib/create-json'
import { convertPDFToTEI } from '../lib/grobid'
import { logger } from '../lib/logger'
import { sendArchive } from '../lib/send-archive'
import { createRequestDirectory } from '../lib/temp-dir'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /import/pdf:
 *   post:
 *     description: Convert PDF file to Manuscripts data via GROBID
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *        description: multipart form data including PDF file
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                file:
 *                  type: string
 *                  format: binary
 *            encoding:
 *              file:
 *                contentType: application/pdf
 *     responses:
 *       200:
 *         description: Conversion success
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 */
export const importPDF = Router().post(
  '/import/pdf',
  authentication,
  upload.single('file'),
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    // @ts-ignore
    logger.debug(`Received ${req.file.originalName}`)

    // allow 5 minutes for conversion
    req.setTimeout(5 * 60 * 1000)

    const archive = archiver.create('zip')

    logger.debug('Converting PDF file to TEI XML with GROBID')

    // @ts-ignore
    const extension = req.file.detectedFileExtension
    if (!/^\.pdf?$/.test(extension)) {
      throw new Error('Only .pdf files are supported')
    }

    // Send PDF file to GROBID, receive TEI XML
    const teiStream = await convertPDFToTEI(req.file.stream)
    const tei = await getStream(teiStream)

    const doc = new DOMParser().parseFromString(tei, 'application/xml')

    // TODO: extract images?

    // convert TEI XML to Manuscripts data
    const manuscriptModels = parseTEIGROBIDArticle(doc) as ContainedModel[]

    // output JSON
    const index = createJSON(manuscriptModels)
    archive.append(index, {
      name: 'index.manuscript-json',
    })

    archive.finalize()

    sendArchive(res, archive, 'manuscript.manuproj')
  })
)
