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

import { createArticle } from '../lib/create-article'
import { createDocx } from '../lib/create-docx'
import { createJATSXML } from '../lib/create-jats-xml'
import { jwtAuthentication } from '../lib/jwt-authentication'
import { logger } from '../lib/logger'
import { createTempDir, removeTempDir } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /export/docx:
 *   post:
 *     description: Convert manuscript data to DOCX
 *     produces:
 *       - application/vnd.openxmlformats-officedocument.wordprocessingml.document
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
export const exportDocx = Router().post(
  '/export/docx',
  jwtAuthentication('pressroom'),
  upload.single('file'),
  celebrate({
    body: {
      manuscriptID: Joi.string().required(),
    },
  }),
  wrapAsync(async (req, res) => {
    const { manuscriptID } = req.body as { manuscriptID: string }

    const dir = createTempDir()

    try {
      logger.debug(`Extracting ZIP archive to ${dir}`)
      await unzip(req.file.path, dir)

      // read the data
      const { data } = await fs.readJSON(dir + '/index.manuscript-json')
      const { article, modelMap } = createArticle(data, manuscriptID)

      // create XML
      await fs.writeFile(
        dir + '/manuscript.xml',
        createJATSXML(article, modelMap)
      )

      // TODO: move images
      // TODO: write CSL file from bundle

      // create DOCX
      await createDocx(dir, 'manuscript.xml', 'manuscript.docx')

      // send the file as an attachment
      res.download(dir + '/manuscript.docx')
    } finally {
      await removeTempDir(dir)
    }
  })
)
