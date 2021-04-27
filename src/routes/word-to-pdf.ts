/*!
 * © 2021 Atypon Systems LLC
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
import fs from 'fs-extra'
import getStream from 'get-stream'

import { authentication } from '../lib/authentication'
import { logger } from '../lib/logger'
import { pandoc } from '../lib/pandoc'
import { createRequestDirectory } from '../lib/temp-dir'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /convert/word-to-pdf:
 *   post:
 *     description: Convert Word file to pdf with pandoc
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
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
 *              required:
 *                - file
 *     responses:
 *       200:
 *         description: Conversion success
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 */
export const convertWordToPdf = Router().post(
  '/convert/word-to-pdf',
  authentication,
  upload.single('file'),
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    // @ts-ignore
    logger.debug(`Received ${req.file.originalName}`)

    const dir = req.tempDir

    await fs.writeFile(
      dir + '/manuscript.docx',
      await getStream.buffer(req.file.stream)
    )

    await pandoc(
      'manuscript.docx',
      'manuscript.tex',
      [`--extract-media=${dir}`],
      dir
    )
    await pandoc(
      'manuscript.tex',
      'manuscript.pdf',
      ['--pdf-engine=xelatex'],
      dir
    )

    // send the file as an attachment
    res.download(dir + '/manuscript.pdf')
  })
)
