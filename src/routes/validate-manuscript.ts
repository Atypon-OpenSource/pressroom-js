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
import { createTemplateValidator, InputError } from '@manuscripts/requirements'
import { celebrate, Joi } from 'celebrate'
import { Router } from 'express'
import fs from 'fs-extra'
import createHttpError from 'http-errors'

import { authentication } from '../lib/authentication'
import { logger } from '../lib/logger'
import { chooseManuscriptID } from '../lib/manuscript-id'
import { createRequestDirectory } from '../lib/temp-dir'
import { upload } from '../lib/upload'
import { decompressManuscript } from '../lib/validate-manuscript-archive'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /validate/manuscript:
 *   post:
 *     description: Validate a manuscript against a template
 *     produces:
 *       - application/json
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
 *                templateID:
 *                  type: string
 *            encoding:
 *              file:
 *                contentType: application/zip
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Results'
 */
export const validateManuscript = Router().post(
  '/validate/manuscript',
  authentication,
  upload.single('file'),
  createRequestDirectory,
  decompressManuscript,
  chooseManuscriptID,
  celebrate({
    body: {
      manuscriptID: Joi.string().required(),
      templateID: Joi.string().required(),
    },
  }),
  wrapAsync(async (req, res) => {
    const { manuscriptID, templateID } = req.body as {
      manuscriptID: string
      templateID: string
    }

    const dir = req.tempDir

    const { data } = await fs.readJSON(dir + '/index.manuscript-json')

    try {
      const requirementValidator = createTemplateValidator(templateID)

      logger.info(`Validating manuscript with template "${templateID}"`)

      const results = await requirementValidator(
        data,
        manuscriptID,
        (id: string) => {
          const fileName = id.replace(':', '_')
          const path = `${dir}/Data/${fileName}`
          if (!fs.existsSync(path)) {
            throw createHttpError(400, `${fileName} was not found`)
          }
          return fs.promises.readFile(path)
        }
      )

      res.json(results)
    } catch (e) {
      if (e instanceof InputError) {
        throw createHttpError(400, e.message)
      } else {
        throw e
      }
    }
  })
)
