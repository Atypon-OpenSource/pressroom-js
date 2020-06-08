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
  isFigure,
  parseJATSArticle,
} from '@manuscripts/manuscript-transform'
import archiver from 'archiver'
import { Router } from 'express'
import fs from 'fs-extra'

import { convertFileToJATS } from '../lib/convert-file-to-jats'
import { createJSON } from '../lib/create-json'
import { findManuscriptFile } from '../lib/find-manuscript-file'
import { jwtAuthentication } from '../lib/jwt-authentication'
import { logger } from '../lib/logger'
import { parseXMLFile } from '../lib/parse-xml-file'
import { sendArchive } from '../lib/send-archive'
import { createTempDir, removeTempDir } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /import/zip:
 *   post:
 *     description: Convert manuscript in ZIP file to Manuscripts data
 *     produces:
 *       - application/zip
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *        description: multipart form data including ZIP file containing manuscript
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
 *                contentType: application/zip
 *     responses:
 *       200:
 *         description: Conversion success
 */
export const importZip = Router().post(
  '/import/zip',
  jwtAuthentication('pressroom'),
  upload.single('file'),
  wrapAsync(async (req, res) => {
    logger.debug(`Received ${req.file.originalname}`)

    const dir = createTempDir()

    try {
      // unzip the input
      await unzip(req.file.path, dir)

      // find the main manuscript file
      const result = await findManuscriptFile(dir)

      logger.debug(
        `Converting ${result.format} file ${result.file} to JATS XML`
      )

      // convert the manuscript file to JATS XML via pandoc
      await convertFileToJATS({
        dir,
        from: result.format,
        inputPath: result.file,
        outputPath: 'manuscript.xml',
      })

      // parse the JATS XML
      const doc = await parseXMLFile(dir + '/manuscript.xml')

      // convert the JATS XML to Manuscripts data
      const manuscriptModels = parseJATSArticle(doc) as ContainedModel[]

      // prepare the output ZIP
      const archive = archiver.create('zip')

      // output JSON
      const index = createJSON(manuscriptModels)
      archive.append(index, {
        name: 'index.manuscript-json',
      })

      for (const model of manuscriptModels) {
        if (isFigure(model)) {
          if (model.originalURL) {
            const name = model._id.replace(':', '_')

            logger.debug(`Adding ${model.originalURL} as Data/${name}`)

            archive.append(fs.createReadStream(`${dir}/${model.originalURL}`), {
              name,
              prefix: 'Data/',
            })
          }
        }
      }

      await archive.finalize()

      await sendArchive(res, archive, 'manuscript.manuproj')
    } finally {
      await removeTempDir(dir)
    }
  })
)
