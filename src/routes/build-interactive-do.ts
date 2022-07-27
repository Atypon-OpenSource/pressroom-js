/*!
 * © 2021 Atypon Systems LLC
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
import createHttpError from 'http-errors'
import path from 'path'

import { authentication } from '../lib/authentication'
import { buildContainer, replaceReferences } from '../lib/create-html-mets'
import { processElements } from '../lib/data'
import { logger } from '../lib/logger'
import { chooseManuscriptID } from '../lib/manuscript-id'
import { parseXMLFile } from '../lib/parse-xml-file'
import { sendArchive } from '../lib/send-archive'
import { createRequestDirectory } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /build/interactive-asset-do:
 *   post:
 *     description: Convert interactive HTML asset to Literatum DO bundle
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
 *                baseDoi:
 *                  type: string
 *                title:
 *                  type: string
 *                embedWidth:
 *                  type: string
 *                embedHeight:
 *                  type: string
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
export const buildInteractiveAssetDO = Router().post(
  '/build/interactive-asset-do',
  authentication,
  upload.single('file'),
  createRequestDirectory,
  chooseManuscriptID,
  celebrate({
    body: {
      doi: Joi.string().required(),
      baseDoi: Joi.string().required(),
      title: Joi.string().required(),
      embedWidth: Joi.string().required(),
      embedHeight: Joi.string().required(),
    },
  }),
  wrapAsync(async (req, res) => {
    const { baseDoi, doi, title, embedWidth, embedHeight } = req.body as {
      baseDoi: string
      title: string
      doi: string
      embedWidth: string
      embedHeight: string
    }

    const [, id] = doi.split('/', 2)

    // unzip the input
    const dir = req.tempDir
    // @ts-ignore
    await unzip(req.file.stream, dir)
    if (!fs.existsSync(dir + '/index.html')) {
      throw createHttpError(400, 'index.html not found in the archive')
    }
    const content = await parseXMLFile(dir + '/index.html', 'text/html')

    // prepare the output archive
    const archive = archiver.create('zip')
    const interactiveArchive = archiver.create('zip')
    const files = new Map<string, string>()

    const appendExternalResources = async (element: Element) => {
      const src = element.getAttribute('src') || element.getAttribute('href')
      if (src) {
        const parts = path.parse(src)
        const filePath = `${dir}/${src}`
        if (!fs.existsSync(filePath)) {
          logger.debug(`Missing file ${src}`)
          return
        }

        interactiveArchive.append(fs.createReadStream(filePath), {
          name: parts.base,
        })
        files.set(src, `${id}/${parts.base}`)
      }
    }
    await processElements(content, `//img`, appendExternalResources)
    await processElements(content, `//link`, appendExternalResources)
    await processElements(content, `//script`, appendExternalResources)

    const html = replaceReferences(content, files)
    fs.writeFileSync(dir + '/index.html', html)
    interactiveArchive.append(fs.createReadStream(dir + '/index.html'), {
      name: 'index.html',
    })

    interactiveArchive.finalize()

    archive.append(interactiveArchive, {
      name: 'interactive.zip',
      prefix: `${id}/`,
    })

    // output METS XML (containing MODS metadata, content HTML and file map) in meta folder
    const mets = buildContainer({
      baseDoi,
      embedWidth,
      embedHeight,
      title,
      doi,
      doType: 'embed',
    })
    archive.append(mets, {
      name: `${id}.xml`,
      prefix: `${id}/meta/`,
    })

    archive.finalize()

    sendArchive(res, archive)
  })
)
