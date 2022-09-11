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
import { celebrate, Joi } from 'celebrate'
import { Router } from 'express'
import fs from 'fs-extra'

import { AttachmentData } from '../lib/attachments'
import { authentication } from '../lib/authentication'
import { emailAuthorization } from '../lib/email-authorization'
import { PDFPreviewError } from '../lib/errors'
import { logger } from '../lib/logger'
import { chooseManuscriptID } from '../lib/manuscript-id'
import { parseBodyProperty } from '../lib/parseBodyParams'
import { createPrincePDF } from '../lib/prince-html'
import { createRequestDirectory } from '../lib/temp-dir'
import { upload } from '../lib/upload'
import { decompressManuscript } from '../lib/validate-manuscript-archive'
import { wrapAsync } from '../lib/wrap-async'
/**
 * @swagger
 *
 * /export/pdf:
 *   post:
 *     description: Convert manuscript data to PDF
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
 *                engine:
 *                  type: string
 *                  enum: ['prince-html', 'prince', 'weasyprint', 'xelatex', 'tectonic']
 *                theme:
 *                  type: string
 *                generateSectionLabels:
 *                  type: boolean
 *                attachments:
 *                  type: string
 *                  example: '[{"name":"figure.jpg","url":"attachment:db76bde-4cde-4579-b012-24dead961adc","MIME":"image/jpeg","designation":"figure"}]'
 *              required:
 *                - file
 *                - manuscriptID
 *                - attachments
 *            encoding:
 *              file:
 *                contentType: application/zip
 *     responses:
 *       200:
 *         description: Conversion success
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
export const exportPDF = Router().post(
  '/export/pdf',
  authentication,
  upload.single('file'),
  createRequestDirectory,
  decompressManuscript,
  parseBodyProperty('attachments'),
  chooseManuscriptID,
  celebrate({
    body: {
      manuscriptID: Joi.string().required(),
      engine: Joi.string()
        .empty('')
        .allow('prince', 'prince-html', 'weasyprint', 'xelatex', 'tectonic')
        .default('xelatex'),
      theme: Joi.string().empty(''),
      allowMissingElements: Joi.boolean().empty('').default(false),
      generateSectionLabels: Joi.boolean().empty(''),
      attachments: Joi.array()
        .items({
          designation: Joi.string().required(),
          name: Joi.string().required(),
          url: Joi.string().required(),
          MIME: Joi.string().required(),
          description: Joi.string(),
        })
        .required(),
    },
  }),
  wrapAsync(async (req, res) => {
    const {
      manuscriptID,
      engine,
      theme,
      allowMissingElements,
      generateSectionLabels,
      attachments,
    } = req.body as {
      manuscriptID: string
      engine: 'prince-html'
      theme?: string
      allowMissingElements: boolean
      generateSectionLabels: boolean
      attachments: Array<AttachmentData>
    }

    // restrict access to Prince by email address
    const restrictedEngines = ['prince', 'prince-html']

    if (restrictedEngines.includes(engine)) {
      await new Promise((resolve, reject) =>
        emailAuthorization(req, res, (error?: unknown) => {
          if (error) {
            reject(error)
          } else {
            resolve(error)
          }
        })
      )
    }

    // unzip the input
    const dir = req.tempDir

    // read the data
    const { data } = await fs.readJSON(dir + '/index.manuscript-json')

    if (engine === 'prince-html') {
      try {
        await createPrincePDF(
          dir,
          data,
          manuscriptID,
          'Data',
          attachments,
          theme,
          {
            allowMissingElements,
            generateSectionLabels,
          }
        )
      } catch (e) {
        logger.error(e)
        throw new PDFPreviewError('Conversion failed when exporting to PDF')
      }
    } else {
      throw Error('Engine not supported.')
    }

    // send the file as an attachment
    res.download(dir + '/manuscript.pdf')
  })
)
