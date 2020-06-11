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

import { createArticle } from '../lib/create-article'
import { createJATSXML } from '../lib/create-jats-xml'
import { createPDF } from '../lib/create-pdf'
import { findCSL } from '../lib/find-csl'
import { fixExportedData } from '../lib/fix-exported-data'
import { jwtAuthentication } from '../lib/jwt-authentication'
import { logger } from '../lib/logger'
import { createRequestDirectory } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /export/pdf:
 *   post:
 *     description: Convert manuscript data to PDF
 *     produces:
 *       - application/pdf
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
 *            encoding:
 *              file:
 *                contentType: application/zip
 *     responses:
 *       200:
 *         description: Conversion success
 */
export const exportPDF = Router().post(
  '/export/pdf',
  jwtAuthentication('pressroom-js'),
  upload.single('file'),
  celebrate({
    body: {
      manuscriptID: Joi.string().required(),
    },
  }),
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    const { manuscriptID } = req.body as { manuscriptID: string }

    // unzip the input
    const dir = req.tempDir

    logger.debug(`Extracting ZIP archive to ${dir}`)
    await unzip(req.file.path, dir)

    // read the data
    const { data } = await fs.readJSON(dir + '/index.manuscript-json')
    const { article, modelMap } = createArticle(data, manuscriptID)

    // create XML
    const xml = createJATSXML(article, modelMap)

    // fix data references
    const doc = await new DOMParser().parseFromString(xml, 'application/xml')
    await fixExportedData(doc, dir)
    const jats = new XMLSerializer().serializeToString(doc)

    await fs.writeFile(dir + '/manuscript.xml', jats)

    const manuscript = modelMap.get(manuscriptID) as Manuscript

    // use the CSL style defined in the manuscript bundle
    const csl = await findCSL(dir, manuscript)

    // create PDF
    await createPDF(dir, 'manuscript.xml', 'manuscript.pdf', { csl })

    // send the file as an attachment
    res.download(dir + '/manuscript.pdf')
  })
)
