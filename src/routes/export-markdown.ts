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
import archiver from 'archiver'
import { celebrate, Joi } from 'celebrate'
import { Router } from 'express'
import fs from 'fs-extra'

import { authentication } from '../lib/authentication'
import { createArticle } from '../lib/create-article'
import { createJATSXML } from '../lib/create-jats-xml'
import { createMarkdown } from '../lib/create-markdown'
import { findCSL } from '../lib/find-csl'
import { removeCodeListing } from '../lib/jats-utils'
import { logger } from '../lib/logger'
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
 * /export/markdown:
 *   post:
 *     description: Convert manuscript data to Markdown
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
export const exportMarkdown = Router().post(
  '/export/markdown',
  authentication,
  upload.single('file'),
  createRequestDirectory,
  decompressManuscript,
  chooseManuscriptID,
  celebrate({
    body: {
      manuscriptID: Joi.string().required(),
      allowMissingElements: Joi.boolean().empty('').default(false),
    },
  }),
  wrapAsync(async (req, res) => {
    const { manuscriptID, allowMissingElements } = req.body as {
      manuscriptID: string
      allowMissingElements: boolean
    }

    const dir = req.tempDir

    // read the data
    const { data } = await fs.readJSON(dir + '/index.manuscript-json')
    const { article, modelMap } = createArticle(
      data,
      manuscriptID,
      allowMissingElements
    )

    // prepare the output archive
    const archive = archiver.create('zip')

    // create JATS XML
    const jats = await createJATSXML(article.content, modelMap, {
      mediaPathGenerator: createArchivePathGenerator(dir, archive),
    })

    await fs.writeFile(dir + '/manuscript.xml', removeCodeListing(jats))

    const manuscript = modelMap.get(manuscriptID) as Manuscript

    // use the CSL style defined in the manuscript bundle
    const csl = await findCSL(manuscript, modelMap)
    try {
      // create Markdown
      await createMarkdown(
        dir,
        'manuscript.xml',
        'manuscript.md',
        { csl },
        (childProcess) => res.on('close', () => childProcess.kill())
      )
    } catch (e) {
      logger.error(e)
      throw new Error('Conversion failed when exporting to Markdown')
    }

    archive.append(fs.createReadStream(dir + '/manuscript.md'), {
      name: 'manuscript.md',
    })

    // TODO: add images to archive

    archive.finalize()

    sendArchive(res, archive)
  })
)
