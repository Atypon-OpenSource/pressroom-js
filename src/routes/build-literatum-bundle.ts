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
import { xmlSerializer } from '@manuscripts/manuscript-transform'
import archiver from 'archiver'
import { celebrate, Joi } from 'celebrate'
import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'

import { config } from '../lib/config'
import { buildManifest } from '../lib/create-manifest'
import { createPDF } from '../lib/create-pdf'
import { processElements, XLINK_NAMESPACE } from '../lib/data'
import { convertWordToJATS } from '../lib/extyles-arc'
import { convertJATSToWileyML } from '../lib/gaia'
import { jwtAuthentication } from '../lib/jwt-authentication'
import { logger } from '../lib/logger'
import { parseXMLFile } from '../lib/parse-xml-file'
import { sendArchive } from '../lib/send-archive'
import { createTempDir, removeTempDir } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /build/literatum-bundle:
 *   post:
 *     description: Convert DOCX to JATS/WileyML bundle for Literatum
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
 *                  type: binary
 *                doi:
 *                  type: string
 *                groupDoi:
 *                  type: string
 *                xmlType:
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

export const buildLiteratumBundle = Router().post(
  '/build/literatum-bundle',
  jwtAuthentication('pressroom-js'), // TODO: 'extyles'?
  upload.single('file'),
  celebrate({
    body: {
      doi: Joi.string().required(),
      groupDoi: Joi.string().required(),
      xmlType: Joi.string().allow('jats', 'wileyml'),
      deposit: Joi.boolean(),
    },
  }),
  wrapAsync(async (req, res) => {
    const { doi, groupDoi, xmlType = 'jats', deposit } = req.body as {
      deposit: boolean
      doi: string
      groupDoi: string
      xmlType: string
    }

    const [, articleID] = doi.split('/', 2) // TODO: only article ID?
    const [, groupID] = groupDoi.split('/', 2)

    const extension = path.extname(req.file.originalname)
    if (!/^\.docx?$/.test(extension)) {
      throw new Error('Only .docx and .doc file extensions are supported')
    }
    const docx = await fs.readFile(req.file.path)

    // Send Word file to eXtyles Arc, receive JATS + images in ZIP
    const zip = await convertWordToJATS(docx, extension, config.arc)

    // unzip the input
    const dir = createTempDir()

    try {
      logger.debug(`Extracting ZIP archive to ${dir}`)
      await unzip(zip, dir)

      const archive = archiver.create('zip')

      const manifest = buildManifest({
        groupDoi,
        processingInstructions: {
          priorityLevel: 'high',
          // makeLiveCondition: 'no-errors',
        },
        submissionType: 'partial',
      })
      archive.append(manifest, { name: 'manifest.xml' })

      const doc = await parseXMLFile(dir + '/manuscript.XML')

      const prefix = `${groupID}/${articleID}`

      // fix image references
      const images = await fs.readdir(dir + '/images')

      for (const image of images) {
        const { ext, name } = path.parse(image)

        processElements(doc, `//*[@xlink:href="${name}"]`, (element) => {
          const parentFigure = element.closest('fig')

          const parentFigureID = parentFigure
            ? parentFigure.getAttribute('id')
            : null

          const newName = parentFigureID ? `${parentFigureID}${ext}` : image

          const lowerCaseName = newName.toLowerCase()

          const nodeName = element.nodeName.toLowerCase()

          element.setAttributeNS(
            XLINK_NAMESPACE,
            'href',
            `${nodeName}/${lowerCaseName}`
          )

          archive.append(fs.createReadStream(`${dir}/images/${image}`), {
            name: lowerCaseName,
            prefix: `${prefix}/${nodeName}`,
          })
        })
      }

      const jats = xmlSerializer.serializeToString(doc)

      if (xmlType === 'wileyml') {
        // write WileyML XML file
        const wileyml = await convertJATSToWileyML(jats)
        archive.append(wileyml, { name: `${articleID}.xml`, prefix })
      } else {
        // write JATS XML file
        archive.append(jats, { name: `${articleID}.xml`, prefix })
      }

      // write PDF file
      await createPDF(dir, 'manuscript.xml', 'manuscript.pdf')
      archive.append(fs.createReadStream(dir + '/manuscript.pdf'), {
        name: `${articleID}.pdf`,
        prefix,
      })

      await archive.finalize()

      if (deposit) {
        // TODO: deposit
      } else {
        await sendArchive(res, archive)
      }
    } finally {
      await removeTempDir(dir)
    }
  })
)
