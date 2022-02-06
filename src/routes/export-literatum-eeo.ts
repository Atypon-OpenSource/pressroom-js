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

import { authentication } from '../lib/authentication'
import { createArticle } from '../lib/create-article'
import { createJATSXML } from '../lib/create-jats-xml'
import { createPDF } from '../lib/create-pdf'
import { depositEEO } from '../lib/deposit-eeo'
import { emailAuthorization } from '../lib/email-authorization'
import { removeCodeListing } from '../lib/jats-utils'
import { logger } from '../lib/logger'
import { chooseManuscriptID } from '../lib/manuscript-id'
import { sendArchive } from '../lib/send-archive'
import { createRequestDirectory } from '../lib/temp-dir'
import { upload } from '../lib/upload'
import { decompressManuscript } from '../lib/validate-manuscript-archive'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /export/literatum-eeo:
 *   post:
 *     description: Convert manuscript data to Literatum EEO deposit
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
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
 *                allowMissingElements:
 *                  type: boolean
 *                async:
 *                  type: boolean
 *                doi:
 *                  type: string
 *                journalName:
 *                  type: string
 *                notificationURL:
 *                  type: string
 *                deposit:
 *                  type: boolean
 *                generateSectionLabels:
 *                  type: boolean
 *              required:
 *                - file
 *                - manuscriptID
 *                - doi
 *                - journalName
 *                - notificationURL
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
export const exportLiteratumEEO = Router().post(
  '/export/literatum-eeo',
  authentication,
  emailAuthorization,
  upload.single('file'),
  createRequestDirectory,
  decompressManuscript,
  chooseManuscriptID,
  celebrate({
    body: {
      deposit: Joi.boolean().empty(''),
      doi: Joi.string().required(),
      frontMatterOnly: Joi.boolean().empty(''),
      journalName: Joi.string().required(),
      manuscriptID: Joi.string().required(),
      notificationURL: Joi.string().required(),
      allowMissingElements: Joi.boolean().empty('').default(false),
      async: Joi.boolean().empty('').default(true),
      generateSectionLabels: Joi.boolean().empty(''),
    },
  }),
  wrapAsync(async (req, res) => {
    // validate the input
    const {
      deposit = true,
      doi,
      frontMatterOnly = true,
      journalName,
      manuscriptID,
      notificationURL,
      allowMissingElements,
      async,
      generateSectionLabels,
    } = req.body as {
      deposit: boolean
      doi: string
      frontMatterOnly: boolean
      journalName: string
      manuscriptID: string
      notificationURL: string
      allowMissingElements: boolean
      async: boolean
      generateSectionLabels: boolean
    }

    // unzip the input
    const dir = req.tempDir

    // read the data
    const { data } = await fs.readJSON(dir + '/index.manuscript-json')
    const { article, modelMap } = createArticle(data, manuscriptID, {
      allowMissingElements,
      generateSectionLabels,
    })

    // create XML
    const jats = await createJATSXML(article.content, modelMap, manuscriptID, {
      doi,
      frontMatterOnly,
    })
    await fs.writeFile(dir + '/manuscript.xml', removeCodeListing(jats))
    const xmlStream = fs.readFileSync(dir + '/manuscript.xml')
    try {
      // create PDF
      await createPDF(
        dir,
        'manuscript.xml',
        'manuscript.pdf',
        'xelatex',
        {},
        (childProcess) => res.on('close', () => childProcess.kill())
      )
    } catch (e) {
      logger.error(e)
      throw new Error('Conversion failed when exporting to PDF (Literatum EEO)')
    }
    const pdfStream = fs.readFileSync(dir + '/manuscript.pdf')

    if (deposit) {
      logger.debug(`Depositing to Literatum EEO`)

      const depositState = await depositEEO({
        journalName,
        manuscriptID,
        notificationURL,
        pdf: pdfStream,
        xml: xmlStream,
        async,
      })
      res.json(depositState)
    } else {
      const archive = archiver
        .create('zip')
        .append(xmlStream, { name: 'manuscript.xml' })
        .append(pdfStream, { name: 'manuscript.pdf' })

      archive.finalize()

      sendArchive(res, archive) // for debugging
    }
  })
)
