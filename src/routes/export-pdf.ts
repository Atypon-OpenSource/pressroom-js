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
import { Manuscript } from '@manuscripts/manuscripts-json-schema'
import { celebrate, Joi } from 'celebrate'
import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'

import { authentication } from '../lib/authentication'
import { createArticle } from '../lib/create-article'
import { createJATSXML } from '../lib/create-jats-xml'
import { createPDF, PDFEngine } from '../lib/create-pdf'
import { XLINK_NAMESPACE } from '../lib/data'
import { emailAuthorization } from '../lib/email-authorization'
import { PDFPreviewError } from '../lib/errors'
import { AttachmentData } from '../lib/external-files'
import { findCSL } from '../lib/find-csl'
import { filterJATSResult } from '../lib/jats-utils'
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
 *              required:
 *                - file
 *                - manuscriptID
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
      engine: PDFEngine | 'prince-html'
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
    const { article, modelMap } = createArticle(data, manuscriptID, {
      allowMissingElements,
      generateSectionLabels,
    })

    if (engine === 'prince-html') {
      await createPrincePDF(dir, data, manuscriptID, 'Data', attachments, theme)
    } else {
      // create XML
      const jats = await createJATSXML(
        article.content,
        modelMap,
        manuscriptID,
        {
          mediaPathGenerator: async (element) => {
            const href = element.getAttributeNS(XLINK_NAMESPACE, 'href')

            const { name } = path.parse(href as string)

            return `Data/${name}`
          },
        }
      )

      await fs.writeFile(dir + '/manuscript.xml', filterJATSResult(jats))

      const manuscript = modelMap.get(manuscriptID) as Manuscript

      // use the CSL style defined in the manuscript bundle
      const csl = await findCSL(manuscript, modelMap)
      try {
        // create PDF
        await createPDF(
          dir,
          'manuscript.xml',
          'manuscript.pdf',
          engine || 'xelatex',
          { csl },
          (childProcess) => res.on('close', () => childProcess.kill())
        )
      } catch (e) {
        logger.error(e)
        throw new PDFPreviewError('Conversion failed when exporting to PDF')
      }
    }

    // send the file as an attachment
    res.download(dir + '/manuscript.pdf')
  })
)
