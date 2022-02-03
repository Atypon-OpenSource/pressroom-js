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
import path from 'path'

import { authentication } from '../lib/authentication'
import { convertDocxStyle } from '../lib/convert-docx-style'
import { createArticle } from '../lib/create-article'
import { createDocx } from '../lib/create-docx'
import { createJATSXML } from '../lib/create-jats-xml'
import { XLINK_NAMESPACE } from '../lib/data'
import { findCSL } from '../lib/find-csl'
import { removeCodeListing } from '../lib/jats-utils'
import { logger } from '../lib/logger'
import { chooseManuscriptID } from '../lib/manuscript-id'
import { addNumberingToSections } from '../lib/models'
import { parseXMLFile } from '../lib/parse-xml-file'
import { createRequestDirectory } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { upload } from '../lib/upload'
import { decompressManuscript } from '../lib/validate-manuscript-archive'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /export/docx:
 *   post:
 *     description: Convert manuscript data to DOCX
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
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 */
export const exportDocx = Router().post(
  '/export/docx',
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
    const {
      manuscriptID,
      allowMissingElements,
      generateSectionLabels,
    } = req.body as {
      manuscriptID: string
      allowMissingElements: boolean
      generateSectionLabels: boolean
    }

    const dir = req.tempDir

    // read the data
    const { data } = await fs.readJSON(dir + '/index.manuscript-json')
    addNumberingToSections(data)
    const { article, modelMap } = createArticle(data, manuscriptID, {
      allowMissingElements,
      generateSectionLabels,
    })

    // create XML
    const jats = await createJATSXML(article.content, modelMap, manuscriptID, {
      mediaPathGenerator: async (element) => {
        const href = element.getAttributeNS(XLINK_NAMESPACE, 'href')

        const { name } = path.parse(href as string)

        return `Data/${name}`
      },
    })

    await fs.writeFile(dir + '/manuscript.xml', removeCodeListing(jats))

    const manuscript = modelMap.get(manuscriptID) as Manuscript

    // use the CSL style defined in the manuscript bundle
    const csl = await findCSL(manuscript, modelMap)
    try {
      // create DOCX
      await createDocx(
        dir,
        'manuscript.xml',
        'manuscript.docx',
        { csl },
        (childProcess) => res.on('close', () => childProcess.kill())
      )
    } catch (e) {
      logger.error(e)
      throw new Error('Conversion failed when exporting to docx')
    }

    const docxPath = dir + '/manuscript.docx'
    const docx = fs.readFileSync(docxPath)
    await unzip(docx, dir + '/wordMl')
    const stylesPath = dir + '/wordMl/word/styles.xml'
    const document = await parseXMLFile(stylesPath)
    convertDocxStyle(document, data)

    fs.writeFileSync(
      stylesPath,
      new XMLSerializer().serializeToString(document)
    )

    const archive = archiver('zip')

    archive.directory(dir + '/wordMl', false)

    res.attachment('manuscript.docx')
    archive.pipe(res)
    archive.finalize()
  })
)
