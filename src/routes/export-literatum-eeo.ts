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
import archiver from 'archiver'
import { celebrate, Joi } from 'celebrate'
import { Router } from 'express'
import fs from 'fs-extra'

import { createArticle } from '../lib/create-article'
import { createJATSXML } from '../lib/create-jats-xml'
import { createPDF } from '../lib/create-pdf'
import { depositEEO } from '../lib/deposit-eeo'
import { jwtAuthentication } from '../lib/jwt-authentication'
import { logger } from '../lib/logger'
import { sendArchive } from '../lib/send-archive'
import { createRequestDirectory } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /export/literatum-eeo:
 *   post:
 *     description: Convert manuscript data to Literatum EEO deposit
 *     produces:
 *       - application/zip
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                file:
 *                  type: string
 *                  format: binary
 *                manuscriptID:
 *                  type: string
 *                doi:
 *                  type: string
 *                journalName:
 *                  type: string
 *                notificationURL:
 *                  type: string
 *                deposit:
 *                  type: boolean
 *            encoding:
 *              file:
 *                contentType: application/zip
 *     responses:
 *       200:
 *         description: Conversion success
 */
export const exportLiteratumEEO = Router().post(
  '/export/literatum-eeo',
  jwtAuthentication('pressroom-js'),
  upload.single('file'),
  celebrate({
    body: {
      deposit: Joi.boolean(),
      doi: Joi.string().required(),
      frontMatterOnly: Joi.boolean(),
      journalName: Joi.string().required(),
      manuscriptID: Joi.string().required(),
      notificationURL: Joi.string().required(),
    },
  }),
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    // validate the input
    const {
      deposit = true,
      doi,
      frontMatterOnly = true,
      journalName,
      manuscriptID,
      notificationURL,
    } = req.body as {
      deposit: boolean
      doi: string
      frontMatterOnly: boolean
      journalName: string
      manuscriptID: string
      notificationURL: string
    }

    // unzip the input
    const dir = req.tempDir

    logger.debug(`Extracting ZIP archive to ${dir}`)
    await unzip(req.file.stream, dir)

    // read the data
    const { data } = await fs.readJSON(dir + '/index.manuscript-json')
    const { article, modelMap } = createArticle(data, manuscriptID)

    // create XML
    const jats = await createJATSXML(article, modelMap, {
      doi,
      frontMatterOnly,
    })
    await fs.writeFile(dir + '/manuscript.xml', jats)
    const xmlStream = fs.createReadStream(dir + '/manuscript.xml')

    // create PDF
    await createPDF(dir, 'manuscript.xml', 'manuscript.pdf')
    const pdfStream = fs.createReadStream(dir + '/manuscript.pdf')

    if (deposit) {
      logger.debug(`Depositing to Literatum EEO`)

      await depositEEO({
        journalName,
        manuscriptID,
        notificationURL,
        pdf: pdfStream,
        xml: xmlStream,
      })
    } else {
      const archive = archiver
        .create('zip')
        .append(xmlStream, { name: 'manuscript.xml' })
        .append(pdfStream, { name: 'manuscript.pdf' })

      await archive.finalize()

      sendArchive(res, archive) // for debugging
    }
  })
)
