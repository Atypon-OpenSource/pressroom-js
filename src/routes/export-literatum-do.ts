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
import { format } from 'date-fns'
import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'

import { authentication } from '../lib/authentication'
import { config } from '../lib/config'
import { createArticle } from '../lib/create-article'
import { createHTML } from '../lib/create-html'
import { buildManifest } from '../lib/create-manifest'
import { buildContainer } from '../lib/create-mets'
import { processElements } from '../lib/data'
import { depositSFTP } from '../lib/deposit-sftp'
import { emailAuthorization } from '../lib/email-authorization'
import { logger } from '../lib/logger'
import { chooseManuscriptID } from '../lib/manuscript-id'
import { createHTMLArchivePathGenerator } from '../lib/path-generator'
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
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 */
export const exportLiteratumDO = Router().post(
  '/export/literatum-do',
  authentication,
  emailAuthorization,
  upload.single('file'),
  celebrate({
    body: {
      deposit: Joi.boolean().empty(''),
      doType: Joi.string().required(),
      doi: Joi.string().required(),
      manuscriptID: Joi.string().required(),
    },
  }),
  chooseManuscriptID,
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    const { deposit, doi, doType, manuscriptID } = req.body as {
      deposit?: boolean
      doType: string
      doi: string
      manuscriptID: string
    }

    const [, id] = doi.split('/', 2)

    // unzip the input
    const dir = req.tempDir

    logger.debug(`Extracting ZIP archive to ${dir}`)
    await unzip(req.file.stream, dir)

    // read the data
    const { data } = await fs.readJSON(dir + '/index.manuscript-json')
    const { article, modelMap } = createArticle(data, manuscriptID)

    // prepare the output archive
    const archive = archiver.create('zip')

    // create HTML
    const html = await createHTML(article.content, modelMap, {
      mediaPathGenerator: createHTMLArchivePathGenerator(dir, archive),
    })
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

    // output METS XML (containing MODS metadata, content HTML and file map) in meta folder
    const mets = buildContainer({
      html,
      files,
      manuscript,
      modelMap,
      doType,
    })
    archive.append(mets, {
      name: `${id}.xml`,
      prefix: `${id}/meta/`,
    })

    // output manifest
    const manifest = buildManifest({
      groupDoi: '10.5555/default-do-group',
      submissionType: 'full',
    })
    archive.append(manifest, { name: 'manifest.xml' })

    await archive.finalize()

    if (deposit) {
      logger.debug(`Depositing to Literatum`)

      const { host, prefix, username, pem } = config.literatum.sftp

      const date = format(new Date(), 'yyyyMMddHHmmss')
      const remoteFilePath = `${prefix}/digital-objects_${id}_${date}.zip`

      const privateKey = Buffer.from(pem, 'base64')

      await depositSFTP(archive, remoteFilePath, { host, username, privateKey })
    } else {
      sendArchive(res, archive) // for debugging
    }
  })
)
