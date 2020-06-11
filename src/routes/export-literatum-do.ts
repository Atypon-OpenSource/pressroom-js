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

import { createArticle } from '../lib/create-article'
import { createHTML } from '../lib/create-html'
import { createJATSXML } from '../lib/create-jats-xml'
import { buildManifest } from '../lib/create-manifest'
import { buildContainer } from '../lib/create-mets'
import { processElements } from '../lib/data'
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
 * /export/literatum-do:
 *   post:
 *     description: Convert manuscript data to Literatum DO bundle
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
 *                doi:
 *                  type: string
 *                doType:
 *                  type: string
 *                manuscriptID:
 *                  type: string
 *                deposit:
 *                  type: boolean
 *            encoding:
 *              file:
 *                contentType: application/zip
 *     responses:
 *       200:
 *         description: Conversion success
 */
export const exportLiteratumDO = Router().post(
  '/export/literatum-do',
  jwtAuthentication('pressroom-js'),
  upload.single('file'),
  celebrate({
    body: {
      doType: Joi.string().required(),
      doi: Joi.string().required(),
      manuscriptID: Joi.string().required(),
      deposit: Joi.boolean(),
    },
  }),
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    const { deposit, doi, doType, manuscriptID } = req.body as {
      doType: string
      doi: string
      manuscriptID: string
      deposit?: boolean
    }

    const [, id] = doi.split('/', 2)

    // unzip the input
    const dir = req.tempDir

    logger.debug(`Extracting ZIP archive to ${dir}`)
    await unzip(req.file.path, dir)

    // read the data
    const { data } = await fs.readJSON(dir + '/index.manuscript-json')
    const { article, modelMap } = createArticle(data, manuscriptID)

    // prepare the output archive
    const archive = archiver('zip')

    // output manifest
    const manifest = buildManifest({
      groupDoi: '10.5555/default-do-group',
      submissionType: 'full',
    })
    archive.append(manifest, { name: 'manifest.xml' })

    // create HTML
    const html = createHTML(article.content, modelMap)
    const doc = new DOMParser().parseFromString(html, 'text/html')

    const files = new Map<string, string>()

    await processElements(doc, `//img`, async (element) => {
      const src = element.getAttribute('src')

      if (src) {
        const parts = path.parse(src)

        archive.append(fs.createReadStream(`${dir}/Data/${parts.name}`), {
          name: parts.base,
          prefix: `${id}/Data/`,
        })

        files.set(parts.name, src)
      }
    })

    const manuscript = modelMap.get(manuscriptID) as Manuscript

    // output container XML
    const container = buildContainer({
      html,
      files,
      manuscript,
      modelMap,
      doType,
    })
    archive.append(container, {
      name: `${id}.xml`,
      prefix: `${id}/meta/`,
    })

    // output XML
    const xml = createJATSXML(article, modelMap) // TODO: options
    archive.append(xml, { name: 'manuscript.xml' })

    await archive.finalize()

    if (deposit) {
      logger.debug(`Depositing to Literatum`)
      // TODO: deposit
    } else {
      await sendArchive(res, archive)
    }
  })
)
