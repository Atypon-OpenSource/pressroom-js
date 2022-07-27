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
import createHttpError from 'http-errors'

import { arcCredentials } from '../lib/arc-credentials'
import { authentication } from '../lib/authentication'
import { convertJATSArc } from '../lib/convert-jats-arc'
import { convertWordToJATS } from '../lib/extyles-arc'
import { logger } from '../lib/logger'
import { parseXMLFile } from '../lib/parse-xml-file'
import { sendArchive } from '../lib/send-archive'
import { createRequestDirectory } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /import/word-arc:
 *   post:
 *     description: Convert Word file to Manuscripts data via Arc
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *      - in: header
 *        name: pressroom-extylesarc-secret
 *        schema:
 *          type: string
 *        required: false
 *     requestBody:
 *        description: multipart form data including Word file
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                file:
 *                  type: string
 *                  format: binary
 *     responses:
 *       200:
 *         description: Conversion success
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 */
export const importWordArc = Router().post(
  '/import/word-arc',
  authentication,
  arcCredentials,
  upload.single('file'),
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    // @ts-ignore
    logger.debug(`Received ${req.file.originalName}`)

    // allow 60 minutes for conversion
    req.setTimeout(60 * 60 * 1000)

    const dir = req.tempDir

    // @ts-ignore
    // const extension = req.file.detectedFileExtension
    const extension = req.file.clientReportedFileExtension
    if (!/^\.docx?$/.test(extension)) {
      throw createHttpError(400, 'Only .docx and .doc files are supported')
    }

    // Send Word file to eXtyles Arc, receive JATS + images in ZIP
    const zip = await convertWordToJATS(
      // @ts-ignore
      req.file.stream,
      extension,
      req.user.arc
    )

    // unzip the input
    await unzip(zip, dir)

    const doc = await parseXMLFile(dir + '/manuscript.XML')
    const archive = await convertJATSArc(dir, doc)

    sendArchive(res, archive, 'manuscript.manuproj')
  })
)
