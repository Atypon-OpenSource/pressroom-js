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
import express from 'express'
import fs from 'fs-extra'
import createHttpError from 'http-errors'
import path from 'path'

import { apiKeyAuthentication } from '../lib/authentication'
import { config } from '../lib/config'
import { processElements, XLINK_NAMESPACE } from '../lib/data'
import { convertWordToJATS } from '../lib/extyles-arc'
import { fetchAttachment } from '../lib/fetch-literatum-attachment'
import { convertJATSToWileyML } from '../lib/gaia'
import { logger } from '../lib/logger'
import { parseXMLFile } from '../lib/parse-xml-file'
import { sendArchive } from '../lib/send-archive'
import { createRequestDirectory } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /submission:
 *   post:
 *     description: Fetch and convert submission to WileyML Gateway bundle
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *        description: Submission description in JSON
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                depositoryCode:
 *                  type: string
 *                attachments:
 *                  type: array
 *                  items:
 *                    type: object
 *                metadata:
 *                  type: object
 *     responses:
 *       200:
 *         description: Conversion success
 *         content:
 *           application/zip:
 *            schema:
 *              type: string
 *              format: binary
 */
export const buildSubmissionBundle = express.Router().post(
  '/submission', // TODO
  apiKeyAuthentication,
  express.json(),
  celebrate(
    {
      body: {
        depositoryCode: Joi.string().required(),
        attachments: Joi.array()
          .items(
            Joi.object({
              designation: Joi.string().required(),
              format: Joi.string().required(),
              name: Joi.string().required(),
              url: Joi.string().required(),
            })
          )
          .required(),
        metadata: Joi.object({
          digitalISSN: Joi.string().required(),
          doi: Joi.string().required(),
        }).required(),
      },
    },
    {
      allowUnknown: true,
    }
  ),
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    const { depositoryCode, attachments, metadata } = req.body as {
      depositoryCode: string
      attachments: Array<{
        designation: string
        format: string
        name: string
        url: string
      }>
      metadata: {
        digitalISSN: string
        doi: string
      }
    }
    const dir = req.tempDir

    const issn = metadata.digitalISSN.toUpperCase().replace(/[^0-9X]/, '')
    const [, articleID] = metadata.doi.toUpperCase().split('/', 2)
    const prefix = `${issn}/9999/9999/999A/${articleID}`

    // fetch the files
    // TODO: receive these as a ZIP file instead?
    for (const attachment of attachments) {
      await fetchAttachment(attachment, dir)
    }

    const mainDocuments = attachments.filter(
      (attachment) => attachment.designation === 'Main Document'
    )

    // prepare the output ZIP
    const archive = archiver.create('zip')

    switch (depositoryCode) {
      case 'S1': {
        const attachment = mainDocuments.find((attachment) =>
          ['doc', 'docx'].includes(attachment.format)
        )

        if (!attachment) {
          throw createHttpError(400, 'Expected doc or docx attachment')
        }

        const file = fs.createReadStream(`${dir}/${attachment.name}`)
        const extension = '.' + attachment.format

        logger.debug(`Converting Word file to JATS XML via Arc`)
        const zip = await convertWordToJATS(file, extension, config.arc)

        logger.debug(`Extracting ZIP archive to ${dir}`)
        await unzip(zip, dir)

        const doc = await parseXMLFile(dir + '/manuscript.XML')

        // fix image references
        if (await fs.pathExists(dir + '/images')) {
          const images = await fs.readdir(dir + '/images')

          for (const image of images) {
            const { ext, name } = path.parse(image)

            await processElements(
              doc,
              `//*[@xlink:href="${name}"]`,
              async (element) => {
                const parentFigure = element.closest('fig')

                const parentFigureID = parentFigure
                  ? parentFigure.getAttribute('id')
                  : null

                const newName = parentFigureID
                  ? `${parentFigureID}${ext}`
                  : image

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
              }
            )
          }
        }

        const articleIdElement =
          doc.querySelector(
            'article-meta > article-id[pub-id-type="publisher-id"]'
          ) || doc.querySelector('article-meta > article-id')

        if (articleIdElement) {
          articleIdElement.nodeValue = articleID
        }

        logger.debug(`Converting JATS XML to WileyML`)
        const jats = new XMLSerializer().serializeToString(doc)
        const wileyml = await convertJATSToWileyML(jats)

        archive.append(wileyml, {
          name: `${articleID}.xml`,
          prefix,
        })

        await archive.finalize()

        sendArchive(res, archive)

        break
      }

      // case 'Authorea': {
      //   const attachment = mainDocuments.find((attachment) =>
      //     ['xml'].includes(attachment.format)
      //   )
      //
      //   if (!attachment) {
      //     throw new Error('Expected xml attachment')
      //   }
      //
      //   break
      // }

      default:
        throw new Error(`Unsupported depositoryCode: ${depositoryCode}`)
    }
  })
)
