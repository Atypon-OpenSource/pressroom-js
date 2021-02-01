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
import { format } from 'date-fns'
import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'

import { authentication } from '../lib/authentication'
import { config } from '../lib/config'
import { createArticle } from '../lib/create-article'
import { createJATSXML } from '../lib/create-jats-xml'
import { buildManifest } from '../lib/create-manifest'
import { createPDF } from '../lib/create-pdf'
import { processElements, XLINK_NAMESPACE } from '../lib/data'
import { depositFTPS } from '../lib/deposit-ftps'
import { emailAuthorization } from '../lib/email-authorization'
import { convertJATSToWileyML } from '../lib/gaia'
import { removeCodeListing } from '../lib/jats-utils'
import { logger } from '../lib/logger'
import { chooseManuscriptID } from '../lib/manuscript-id'
import { sendArchive } from '../lib/send-archive'
import { createRequestDirectory } from '../lib/temp-dir'
import { upload } from '../lib/upload'
import { decompressManuscript } from '../lib/validate-manuscript-archive'
import { wrapAsync } from '../lib/wrap-async'

type XmlType = 'jats' | 'wileyml'

/**
 * @swagger
 *
 * /export/literatum-bundle:
 *   post:
 *     description: Convert manuscript data to JATS/WileyML bundle for deposit in Literatum
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
 *                deposit:
 *                  type: boolean
 *                doi:
 *                  type: string
 *                frontMatterOnly:
 *                  type: boolean
 *                groupDOI:
 *                  type: string
 *                seriesCode:
 *                  type: string
 *                xmlType:
 *                  type: string
 *                  enum: ['jats', 'wileyml']
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
export const exportLiteratumBundle = Router().post(
  '/export/literatum-bundle',
  authentication,
  emailAuthorization,
  upload.single('file'),
  createRequestDirectory,
  decompressManuscript,
  chooseManuscriptID,
  celebrate({
    body: {
      deposit: Joi.boolean().empty(''),
      doi: Joi.string().required(),
      frontMatterOnly: Joi.boolean().empty(''),
      groupDOI: Joi.string().required(),
      manuscriptID: Joi.string().required(),
      seriesCode: Joi.string().required(),
      xmlType: Joi.string().empty('').allow('jats', 'wileyml'),
      allowMissingElements: Joi.boolean().empty('').default(false),
    },
  }),
  wrapAsync(async (req, res) => {
    // validate the input
    const {
      deposit = false,
      doi,
      frontMatterOnly = false,
      groupDOI,
      manuscriptID,
      seriesCode,
      xmlType = 'jats',
      allowMissingElements,
    } = req.body as {
      deposit: boolean
      doi: string
      frontMatterOnly: boolean
      groupDOI: string
      manuscriptID: string
      seriesCode: string
      xmlType: XmlType
      allowMissingElements: boolean
    }

    const [, articleID] = doi.split('/', 2) // TODO: only article ID?
    const [, groupID] = groupDOI.split('/', 2) // TODO: only group ID?

    // unzip the input
    const dir = req.tempDir

    // read the data
    const { data } = await fs.readJSON(dir + '/index.manuscript-json')
    const { article, modelMap } = createArticle(
      data,
      manuscriptID,
      allowMissingElements
    )

    // create JATS XML
    const xml = await createJATSXML(article.content, modelMap, {
      doi,
      frontMatterOnly,
    })
    const doc = new DOMParser().parseFromString(xml, 'application/xml')

    // create the output ZIP
    const archive = archiver.create('zip')

    const prefix = `${groupID}/${articleID}`

    // fix image references
    if (await fs.pathExists(dir + '/Data')) {
      const images = await fs.readdir(dir + '/Data')

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
          }
        )
      }
    }

    const jats = new XMLSerializer().serializeToString(doc)
    await fs.writeFile(dir + '/manuscript.xml', removeCodeListing(jats))

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

    // write manifest
    const manifest = buildManifest({
      groupDoi: groupDOI,
      processingInstructions: {
        priorityLevel: 'high',
        // makeLiveCondition: 'no-errors',
      },
      submissionType: 'partial',
    })
    archive.append(manifest, { name: 'manifest.xml' })

    archive.finalize()

    if (deposit) {
      logger.debug(`Depositing to Literatum`)

      const { host, prefix, username, password } = config.literatum.ftps

      const date = format(new Date(), 'yyyyMMddHHmmss')
      const remoteFilePath = `${prefix}/${seriesCode}_${groupID}_${date}.zip`

      await depositFTPS(archive, remoteFilePath, {
        host,
        user: username,
        password,
      })
    } else {
      sendArchive(res, archive) // for debugging
    }
  })
)
