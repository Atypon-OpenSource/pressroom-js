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

import { AttachmentData } from '../lib/attachments'
import { authentication } from '../lib/authentication'
import { createLiteratumJats } from '../lib/create-literatum-jats'
import { buildManifest } from '../lib/create-manifest'
import { processElements } from '../lib/data'
import { VALID_DOI_REGEX } from '../lib/doi'
import { emailAuthorization } from '../lib/email-authorization'
import { removeCodeListing } from '../lib/jats-utils'
import { chooseManuscriptID } from '../lib/manuscript-id'
import { parseBodyProperty } from '../lib/parseBodyParams'
import { parseSupplementaryDOIs } from '../lib/parseSupplementaryDOIs'
import { createPrincePDF } from '../lib/prince-html'
import { sendArchive } from '../lib/send-archive'
import { createRequestDirectory } from '../lib/temp-dir'
import { upload } from '../lib/upload'
import { decompressManuscript } from '../lib/validate-manuscript-archive'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /export/bundle/literatum:
 *   post:
 *     description: Convert manuscript data to JATS bundle
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
 *                doi:
 *                  type: string
 *                frontMatterOnly:
 *                  type: boolean
 *                groupDOI:
 *                  type: string
 *                theme:
 *                  type: string
 *                supplementaryMaterialDOIs:
 *                  type: string
 *                  example: '[{"url":"path/to","doi":"10.1000/xyz123"}]'
 *                attachments:
 *                  type: string
 *                  example: '[{"name":"figure.jpg","url":"attachment:db76bde-4cde-4579-b012-24dead961adc","MIME":"image/jpeg","designation":"figure"}]'
 *              required:
 *                - file
 *                - doi
 *                - groupDOI
 *                - manuscriptID
 *                - supplementaryMaterialDOIs
 *                - attachments
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
export const exportBundleLiteratum = Router().post(
  '/export/bundle/literatum',
  authentication,
  emailAuthorization,
  upload.single('file'),
  createRequestDirectory,
  decompressManuscript,
  chooseManuscriptID,
  parseSupplementaryDOIs,
  parseBodyProperty('attachments'),
  celebrate({
    body: {
      doi: Joi.string().pattern(VALID_DOI_REGEX).required(),
      frontMatterOnly: Joi.boolean().empty(''),
      groupDOI: Joi.string().pattern(VALID_DOI_REGEX).required(),
      manuscriptID: Joi.string().required(),
      theme: Joi.string().empty(''),
      supplementaryMaterialDOIs: Joi.array()
        .items({
          url: Joi.string().required(),
          doi: Joi.string().pattern(VALID_DOI_REGEX).required(),
        })
        .required(),
      attachments: Joi.array()
        .items({
          designation: Joi.string().required(),
          name: Joi.string().required(),
          url: Joi.string().required(),
          MIME: Joi.string().required(),
          description: Joi.string(),
        })
        .required(),
    },
  }),
  wrapAsync(async (req, res) => {
    // validate the input
    const {
      doi,
      frontMatterOnly = false,
      groupDOI,
      manuscriptID,
      theme,
      supplementaryMaterialDOIs,
      attachments,
    } = req.body as {
      doi: string
      frontMatterOnly: boolean
      groupDOI: string
      manuscriptID: string
      theme?: string
      supplementaryMaterialDOIs: Array<{ url: string; doi: string }>
      attachments: Array<AttachmentData>
    }
    const [, articleID] = doi.split('/', 2) // TODO: only article ID?
    const [, groupID] = groupDOI.split('/', 2) // TODO: only group ID?

    // unzip the input
    const dir = req.tempDir

    // read the data
    const { data } = await fs.readJSON(dir + '/index.manuscript-json')

    // create the output ZIP
    const archive = archiver.create('zip')

    const doc = await createLiteratumJats(
      manuscriptID,
      data,
      attachments,
      doi,
      supplementaryMaterialDOIs,
      frontMatterOnly
    )

    const prefix = `${groupID}/${articleID}`

    // add images to archive
    if (await fs.pathExists(dir + '/Data')) {
      const files = await fs.readdir(dir + '/Data')
      const graphicPath = dir + '/graphic'
      // Rename directory from data to graphic to match JATS hrefs
      fs.renameSync(dir + '/Data', graphicPath)
      for (const file of files) {
        const filePath = `${graphicPath}/${file}`
        await processElements(doc, `//*[@xlink:href="${file}"]`, async () => {
          archive.append(fs.createReadStream(filePath), {
            name: file,
            prefix: `${prefix}/graphic`,
          })
        })
        // Add external files to archive
        await processElements(
          doc,
          `//*[@href="external/${file}"]`,
          async () => {
            archive.append(fs.createReadStream(filePath), {
              name: file,
              prefix: `${prefix}/external`,
            })
          }
        )
      }
    }

    const jats = new XMLSerializer().serializeToString(doc)
    await fs.writeFile(dir + '/manuscript.xml', removeCodeListing(jats))

    archive.append(jats, { name: `${articleID}.xml`, prefix })

    const pdfFile = await createPrincePDF(
      dir,
      data,
      manuscriptID,
      undefined,
      attachments,
      theme
    )

    archive.append(fs.createReadStream(pdfFile), {
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
    sendArchive(res, archive) // for debugging
  })
)
