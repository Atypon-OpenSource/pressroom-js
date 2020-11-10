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

import { authentication } from '../lib/authentication'
import { convertFileToJATS } from '../lib/convert-file-to-jats'
import { convertLatexToJATS } from '../lib/convert-latex-to-jats'
import { createJSON } from '../lib/create-json'
import { findManuscriptFile } from '../lib/find-manuscript-file'
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
 * /import/zip:
 *   post:
 *     description: Convert manuscript in ZIP file to Manuscripts data
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
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
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 */
export const importZip = Router().post(
  '/import/zip',
  authentication,
  upload.single('file'),
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    // @ts-ignore
    logger.debug(`Received ${req.file.originalName}`)

    const dir = req.tempDir

    // unzip the input
    await unzip(req.file.stream, dir)

    // find the main manuscript file
    const result = await findManuscriptFile(dir)

    // pre-convert a LaTeX manuscript file to JATS XML via latexml
    if (result.format === 'latex') {
      logger.debug(`Converting ${result.format} file ${result.file} to HTML`)

      await convertLatexToJATS({
        dir,
        inputPath: result.file,
        outputPath: 'latex-manuscript.xml',
      })

      result.format = 'jats'
      result.file = 'latex-manuscript.xml'
    }

    logger.debug(`Converting ${result.format} file ${result.file} to JATS XML`)

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
          const filePath = `${dir}/${model.originalURL}`

          if (await fs.pathExists(filePath)) {
            const name = model._id.replace(':', '_')

            logger.debug(`Adding ${model.originalURL} as Data/${name}`)

            archive.append(fs.createReadStream(filePath), {
              name,
              prefix: 'Data/',
            })
          } else {
            logger.warn(`File ${model.originalURL} does not exist`)
          }
        }
      }
    }

    await archive.finalize()

    sendArchive(res, archive, 'manuscript.manuproj')
  })
)
