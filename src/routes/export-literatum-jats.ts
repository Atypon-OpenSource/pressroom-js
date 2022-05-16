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
import { celebrate, Joi } from 'celebrate'
import { Router } from 'express'
import fs from 'fs-extra'

import { AttachmentData } from '../lib/attachments'
import { authentication } from '../lib/authentication'
import { createLiteratumJats } from '../lib/create-literatum-jats'
import { VALID_DOI_REGEX } from '../lib/doi'
import { emailAuthorization } from '../lib/email-authorization'
import { removeCodeListing } from '../lib/jats-utils'
import { chooseManuscriptID } from '../lib/manuscript-id'
import { parseBodyProperty } from '../lib/parseBodyParams'
import { parseSupplementaryDOIs } from '../lib/parseSupplementaryDOIs'
import { createRequestDirectory } from '../lib/temp-dir'
import { upload } from '../lib/upload'
import { decompressManuscript } from '../lib/validate-manuscript-archive'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /export/literatum-jats:
 *   post:
 *     description: Convert manuscript data to a ZIP file containing a JATS XML file
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
 *                supplementaryMaterialDOIs:
 *                  type: string
 *                  example: '[{"url":"path/to","doi":"10.1000/xyz123"}]'
 *                attachments:
 *                  type: string
 *                  example: '[{"name":"figure.jpg","url":"attachment:db76bde-4cde-4579-b012-24dead961adc","MIME":"image/jpeg","designation":"figure"}]'
 *              required:
 *                - file
 *                - manuscriptID
 *                - doi
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
export const exportLiteratumJats = Router().post(
  '/export/literatum-jats',
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
      manuscriptID: Joi.string().required(),
      version: Joi.string().empty(''),
      doi: Joi.string().pattern(VALID_DOI_REGEX).required(),
      frontMatterOnly: Joi.boolean().empty(''),
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
    const {
      manuscriptID,
      doi,
      frontMatterOnly,
      supplementaryMaterialDOIs,
      attachments,
    } = req.body as {
      manuscriptID: string
      doi: string
      frontMatterOnly: boolean
      supplementaryMaterialDOIs: Array<{ url: string; doi: string }>
      attachments: Array<AttachmentData>
    }

    const dir = req.tempDir
    // read the data
    const { data } = await fs.readJSON(dir + '/index.manuscript-json')
    const doc = await createLiteratumJats(
      manuscriptID,
      data,
      attachments,
      doi,
      supplementaryMaterialDOIs,
      frontMatterOnly
    )

    const jats = new XMLSerializer().serializeToString(doc)

    return res.type('application/xml').send(removeCodeListing(jats))
  })
)
