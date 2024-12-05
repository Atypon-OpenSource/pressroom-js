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
import { Joi } from 'celebrate'
import { Router } from 'express'
import fs from 'fs-extra'

import { Version } from '../jats'
import {
  BasicAttachmentData,
  generateBasicAttachmentsMap,
  generateGraphicsMap,
} from '../lib/attachments'
import { authentication } from '../lib/authentication'
import { celebrate } from '../lib/celebrate'
import { createArticle } from '../lib/create-article'
import { createJATSXML } from '../lib/create-jats-xml'
import { createIdGenerator } from '../lib/id-generator'
import { chooseManuscriptID } from '../lib/manuscript-id'
import { parseBodyProperty } from '../lib/parseBodyParams'
import { createAttachmentPathGenerator } from '../lib/path-generator'
import { sendArchive } from '../lib/send-archive'
import { createRequestDirectory } from '../lib/temp-dir'
import { upload } from '../lib/upload'
import { decompressManuscript } from '../lib/validate-manuscript-archive'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /export/bundle/jats:
 *   post:
 *     description: Convert manuscript data to a ZIP file containing a JATS XML file
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
 *                version:
 *                  type: string
 *                generateSectionLabels:
 *                  type: boolean
 *                attachments:
 *                  type: string
 *                  example: '[{"name":"figure.jpg","url":"attachment:db76bde-4cde-4579-b012-24dead961adc"}]'
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
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 */
export const exportBundleJATS = Router().post(
  ['/export/bundle/jats', '/export/icml'],
  authentication,
  upload.single('file'),
  createRequestDirectory,
  decompressManuscript,
  chooseManuscriptID,
  parseBodyProperty('attachments'),
  celebrate({
    body: {
      manuscriptID: Joi.string().required(),
      allowMissingElements: Joi.boolean().empty('').default(false),
      version: Joi.string().empty(''),
      generateSectionLabels: Joi.boolean().empty(''),
      citationStyle: Joi.string().required(),
      locale: Joi.string().required(),
      attachments: Joi.array()
        .items({
          name: Joi.string().required(),
          url: Joi.string().required(),
        })
        .required(),
    },
  }),
  wrapAsync(async (req, res) => {
    const {
      manuscriptID,
      version,
      allowMissingElements,
      generateSectionLabels,
      attachments,
      citationStyle,
      locale,
    } = req.body as {
      manuscriptID: string
      version?: Version
      allowMissingElements: boolean
      generateSectionLabels: boolean
      attachments: Array<BasicAttachmentData>
      citationStyle: string
      locale: string
    }

    const dir = req.tempDir
    // read the data
    const { data } = await fs.readJSON(dir + '/index.manuscript-json')
    const { article, modelMap } = createArticle(data, manuscriptID, {
      allowMissingElements,
      generateSectionLabels,
    })

    // prepare the output archive
    const archive = archiver.create('zip')
    const graphicsMap = generateGraphicsMap(data)
    const attachmentsMap = generateBasicAttachmentsMap(attachments)
    // create JATS XML
    const jats = await createJATSXML(article.content, modelMap, manuscriptID, {
      version,
      csl: { style: citationStyle, locale },
      idGenerator: createIdGenerator(),
      mediaPathGenerator: createAttachmentPathGenerator(
        dir,
        archive,
        graphicsMap,
        attachmentsMap,
        allowMissingElements
      ),
    })

    archive.append(jats, { name: 'manuscript.xml' })

    archive.finalize()

    sendArchive(res, archive)
  })
)
