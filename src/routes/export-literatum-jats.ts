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
 * /export/literatum-jats:
 *   post:
 *     description: Convert manuscript data to Literatum JATS bundle
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
 *            encoding:
 *              file:
 *                contentType: application/zip
 *     responses:
 *       200:
 *         description: Conversion success
 */
export const exportLiteratumJATS = Router().post(
  '/export/literatum-jats',
  jwtAuthentication('pressroom-js'),
  upload.single('file'),
  celebrate({
    body: {
      manuscriptID: Joi.string().required(),
      doi: Joi.string().required(),
      frontMatterOnly: Joi.boolean(),
      deposit: Joi.boolean(),
    },
  }),
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    // validate the input
    const {
      manuscriptID,
      doi,
      frontMatterOnly = false,
      deposit = false,
    } = req.body as {
      manuscriptID: string
      doi: string
      frontMatterOnly: boolean
      deposit: boolean
    }

    // unzip the input
    const dir = req.tempDir

    logger.debug(`Extracting ZIP archive to ${dir}`)
    await unzip(req.file.path, dir)

    // read the data
    const { data } = await fs.readJSON(dir + '/index.manuscript-json')
    const { article, modelMap } = createArticle(data, manuscriptID)

    // create the output ZIP archive
    const archive = archiver.create('zip')

    // output XML
    archive.append(createJATSXML(article, modelMap, { doi, frontMatterOnly }), {
      name: 'manuscript.xml',
    })

    await archive.finalize()

    if (deposit) {
      logger.debug(`Depositing to Literatum`)
      // TODO: deposit
    } else {
      await sendArchive(res, archive)
    }
  })
)
