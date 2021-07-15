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
import {
  ContainedModel,
  InvalidInput,
  isFigure,
  parseJATSArticle,
} from '@manuscripts/manuscript-transform'
import { ObjectTypes } from '@manuscripts/manuscripts-json-schema'
import { createTemplateValidator, InputError } from '@manuscripts/requirements'
import { celebrate, Joi } from 'celebrate'
import { Router } from 'express'
import fs from 'fs-extra'
import createHttpError from 'http-errors'

import { authentication } from '../lib/authentication'
import { fixImageReferences } from '../lib/fix-jats-references'
import { parseXMLFile } from '../lib/parse-xml-file'
import { createRequestDirectory } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { upload } from '../lib/upload'
import { promiseHandler } from '../lib/utils'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /validate/jats:
 *   post:
 *     description: Validate JATS against a template
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
export const validateJATS = Router().post(
  '/validate/jats',
  authentication,
  upload.single('file'),
  celebrate({
    body: {
      templateID: Joi.string().required(),
    },
  }),
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    const { templateID } = req.body as {
      templateID: string
    }
    const dir = req.tempDir

    // unzip the input
    await unzip(req.file.stream, dir)

    const jatsPath = dir + '/manuscript.xml'
    if (!fs.existsSync(jatsPath)) {
      throw createHttpError(400, `manuscript.xml not found`)
    }
    // parse the JATS XML and fix data references
    const doc = await parseXMLFile(jatsPath)
    await fixImageReferences(dir + '/images', doc)

    // convert the JATS XML to Manuscripts data
    const [data, error] = await promiseHandler(parseJATSArticle(doc))
    if (error instanceof InvalidInput) {
      throw createHttpError(400, error)
    } else if (error) {
      throw new Error(error)
    }
    const manuscriptModels = data as ContainedModel[]
    // find manuscript ID
    const manuscriptObject = manuscriptModels.find(
      (item) => item.objectType === ObjectTypes.Manuscript
    )
    if (!manuscriptObject) {
      throw new Error('Could not find a Manuscript object')
    }

    const figurePath = new Map<string, string>()
    for (const model of manuscriptModels) {
      if (isFigure(model)) {
        if (model.originalURL) {
          const path = `${dir}/${model.originalURL}`
          figurePath.set(model._id, path)
        }
      }
    }
    const getData = (id: string): Promise<Buffer> => {
      const path = figurePath.get(id)
      if (!path || !fs.existsSync(path)) {
        throw createHttpError(400, `${id} was not found`)
      }
      return fs.readFile(path)
    }

    try {
      const validator = createTemplateValidator(templateID)
      const results = await validator(
        manuscriptModels,
        manuscriptObject._id,
        getData
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
