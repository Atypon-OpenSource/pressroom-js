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
  InvalidInput,
  isFigure,
  parseJATSArticle,
} from '@manuscripts/manuscript-transform'
import archiver from 'archiver'
import { celebrate, Joi } from 'celebrate'
import { Router } from 'express'
import fs from 'fs-extra'
import getStream from 'get-stream'
import createHttpError from 'http-errors'

import { authentication } from '../lib/authentication'
import { convertFileToJATS } from '../lib/convert-file-to-jats'
import { createJSON } from '../lib/create-json'
import { enrichMetadata } from '../lib/enrich-metadata'
import { extractMetaData } from '../lib/grobid'
import { logger } from '../lib/logger'
import { pandoc } from '../lib/pandoc'
import { parseXMLFile } from '../lib/parse-xml-file'
import { sendArchive } from '../lib/send-archive'
import { createRequestDirectory } from '../lib/temp-dir'
import { upload } from '../lib/upload'
import { promiseHandler } from '../lib/utils'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /import/word:
 *   post:
 *     description: Convert Word file to Manuscripts data with pandoc
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
 *                enrichMetadata:
 *                  type: boolean
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
export const importWord = Router().post(
  '/import/word',
  authentication,
  upload.single('file'),
  celebrate({
    body: Joi.object({
      enrichMetadata: Joi.boolean().empty(''),
    }),
  }),
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    // @ts-ignore
    logger.debug(`Received ${req.file.originalName}`)

    const dir = req.tempDir

    const archive = archiver.create('zip')

    await fs.writeFile(
      dir + '/manuscript.docx',
      await getStream.buffer(req.file.stream)
    )

    // convert the Word file to JATS XML via pandoc
    logger.debug('Converting Word file to JATS XML via pandoc')
    try {
      await convertFileToJATS(
        {
          dir,
          from: 'docx',
          inputPath: 'manuscript.docx',
          outputPath: 'manuscript.xml',
        },
        (childProcess) => res.on('close', () => childProcess.kill())
      )
    } catch (e) {
      logger.error(e)
      throw new Error('Conversion failed when importing docx')
    }

    // parse the JATS XML
    const doc = await parseXMLFile(dir + '/manuscript.xml')
    if (req.body.enrichMetadata) {
      await pandoc(
        'manuscript.docx',
        'manuscript.pdf',
        ['--pdf-engine=xelatex'],
        dir
      )
      const metadata = await extractMetaData(
        fs.createReadStream(`${dir}/manuscript.pdf`)
      )
      const metadataXML = new DOMParser().parseFromString(
        await getStream(metadata),
        'application/xml'
      )
      // doc will be mutated
      enrichMetadata(metadataXML, doc)
    }
    // convert the JATS XML to Manuscripts data
    const [data, error] = await promiseHandler(parseJATSArticle(doc))
    if (error instanceof InvalidInput) {
      throw createHttpError(400, error)
    } else if (error) {
      throw new Error(error)
    }
    const manuscriptModels = data as ContainedModel[]

    // output JSON
    archive.append(createJSON(manuscriptModels), {
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

    archive.finalize()

    sendArchive(res, archive, 'manuscript.manuproj')
  })
)
