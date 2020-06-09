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

import { createPDF } from '../lib/create-pdf'
import { processElements, XLINK_NAMESPACE } from '../lib/data'
import { convertWordToJATS } from '../lib/extyles-arc'
import { convertJATSToWileyML } from '../lib/gaia'
import { jwtAuthentication } from '../lib/jwt-authentication'
import { parseXMLFile } from '../lib/parse-xml-file'
import { sendArchive } from '../lib/send-archive'
import { createTempDir, removeTempDir } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /build/gateway-bundle:
 *   post:
 *     description: Convert DOCX to JATS/WileyML bundle for Gateway
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
 *                issn:
 *                  type: string
 *     responses:
 *       200:
 *         description: Conversion success
 */

export const buildGatewayBundle = Router().post(
  '/build/gateway-bundle',
  jwtAuthentication('pressroom-js'), // TODO: 'extyles'?
  upload.single('file'),
  celebrate({
    body: {
      doi: Joi.string().required(), // TODO: articleID instead?
      issn: Joi.string().required(),
      deposit: Joi.boolean(),
    },
  }),
  wrapAsync(async (req, res) => {
    const { doi, issn, deposit } = req.body as {
      doi: string
      issn: string
      deposit: boolean
    }

    const docx = await fs.readFile(req.file.path)

    // Send DOCX to eXtyles Arc, receive JATS + images in ZIP
    const zip = await convertWordToJATS(docx, req.user.arc)

    // unzip the input
    const dir = createTempDir()

    try {
      await unzip(zip, dir)

      const archive = archiver.create('zip')

      const issnFolder = issn.toUpperCase().replace(/[^0-9X]/, '')

      const [, articleID] = doi.toUpperCase().split('/', 2)

      const prefix = `${issnFolder}/9999/9999/999A/${articleID}`

      const doc = await parseXMLFile(dir + '/manuscript.XML')

      // fix image references
      if (await fs.pathExists(dir + '/images')) {
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

            element.setAttributeNS(
              XLINK_NAMESPACE,
              'href',
              `image_a/${lowerCaseName}`
            )

            archive.append(fs.createReadStream(`${dir}/images/${image}`), {
              name: lowerCaseName,
              prefix: `${prefix}/image_a/`,
            })
          })
        }
      }

      const articleIdElement =
        doc.querySelector(
          'article-meta > article-id[pub-id-type="publisher-id"]'
        ) || doc.querySelector('article-meta > article-id')

      if (articleIdElement) {
        articleIdElement.nodeValue = articleID
      }

      // write XML file
      const jats = xmlSerializer.serializeToString(doc)
      const wileyml = await convertJATSToWileyML(jats)
      archive.append(wileyml, { name: `${articleID}.xml`, prefix })

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
