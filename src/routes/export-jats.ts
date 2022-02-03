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
import { Version } from '@manuscripts/manuscript-transform'
import archiver from 'archiver'
import { celebrate, Joi } from 'celebrate'
import { Router } from 'express'
import fs from 'fs-extra'

import { authentication } from '../lib/authentication'
import { createArticle } from '../lib/create-article'
import { createJATSXML } from '../lib/create-jats-xml'
import { generateFiguresWithExternalFiles } from '../lib/external-files'
import { createIdGenerator } from '../lib/id-generator'
import { chooseManuscriptID } from '../lib/manuscript-id'
import { createArchivePathGenerator } from '../lib/path-generator'
import { sendArchive } from '../lib/send-archive'
import { createRequestDirectory } from '../lib/temp-dir'
import { upload } from '../lib/upload'
import { decompressManuscript } from '../lib/validate-manuscript-archive'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /export/jats:
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
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 */
export const exportJats = Router().post(
  '/export/jats',
  authentication,
  upload.single('file'),
  createRequestDirectory,
  decompressManuscript,
  chooseManuscriptID,
  celebrate({
    body: {
      manuscriptID: Joi.string().required(),
      allowMissingElements: Joi.boolean().empty('').default(false),
      version: Joi.string().empty(''),
    },
  }),
  wrapAsync(async (req, res) => {
    const {
      manuscriptID,
      version,
      allowMissingElements,
      generateSectionLabels,
    } = req.body as {
      manuscriptID: string
      version?: Version
      allowMissingElements: boolean
      generateSectionLabels: boolean
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
    const externalFiles = generateFiguresWithExternalFiles(data)
    // create JATS XML
    const jats = await createJATSXML(article.content, modelMap, manuscriptID, {
      version,
      idGenerator: createIdGenerator(),
      mediaPathGenerator: createArchivePathGenerator(
        dir,
        archive,
        externalFiles,
        allowMissingElements
      ),
    })

    archive.append(jats, { name: 'manuscript.xml' })

    archive.finalize()

    sendArchive(res, archive)
  })
)
