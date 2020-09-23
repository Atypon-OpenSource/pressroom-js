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
import { unzip } from '../lib/unzip'
import { upload } from '../lib/upload'
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
 * components:
 *   schemas:
 *     Results:
 *       type: array
 *       items:
 *         oneOf:
 *           - $ref: '#/components/schemas/SectionTitleValidationResult'
 *           - $ref: '#/components/schemas/RequiredSectionValidationResult'
 *           - $ref: '#/components/schemas/SectionOrderValidationResult'
 *           - $ref: '#/components/schemas/SectionBodyValidationResult'
 *           - $ref: '#/components/schemas/SectionCategoryValidation'
 *           - $ref: '#/components/schemas/CountValidationResult'
 *           - $ref: '#/components/schemas/FigureFormatValidationResult'
 *           - $ref: '#/components/schemas/BibliographyValidationResult'
 *     ValidationResult:
 *       type: object
 *       properties:
 *         passed:
 *           type: boolean
 *           description: true if the check passed the validation false otherwise.
 *         severity:
 *           type: number
 *           description: the severity of the requirement
 *     SectionTitleValidationResult:
 *       allOf:
 *         - $ref: '#/components/schemas/ValidationResult'
 *         - type: object
 *           properties:
 *             type:
 *               type: string
 *               enum:
 *                 - section-title-match
 *                 - section-title-contains-content
 *               description: values<br>
 *                 <ul>
 *                 <li>'section-title-match' title matches template title</li>
 *                 <li>'section-title-contains-content' title contains content</li>
 *                 </ul>
 *             data:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The ID of the manuscript object
 *                 title:
 *                   type: string
 *                   description: The required title
 *     RequiredSectionValidationResult:
 *       allOf:
 *         - $ref: '#/components/schemas/ValidationResult'
 *         - type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [required-section]
 *               description:  validates the existence of the mandatory sections
 *             data:
 *               type: object
 *               properties:
 *                 sectionDescription:
 *                   type: object
 *                   properties:
 *                     sectionCategory:
 *                       type: string
 *     SectionBodyValidationResult:
 *       allOf:
 *         - $ref: '#/components/schemas/ValidationResult'
 *         - type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [section-body-has-content]
 *               description: validates if the section body contains content
 *             data:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The ID of the manuscript object
 *     BibliographyValidationResult:
 *       allOf:
 *         - $ref: '#/components/schemas/ValidationResult'
 *         - type: object
 *           properties:
 *             type:
 *               type: string
 *               enum:
 *                 - bibliography-doi-format
 *                 - bibliography-doi-exist
 *               description: values<br>
 *                 <ul>
 *                 <li>'bibliography-doi-format' validates the format of the doi</li>
 *                 <li>'bibliography-doi-exist' validates if the doi exist</li>
 *                 </ul>
 *             data:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The ID of the manuscript object
 *     SectionCategoryValidation:
 *       allOf:
 *         - $ref: '#/components/schemas/ValidationResult'
 *         - type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [section-category-uniqueness]
 *               description: validates if the section should be unique in its scope
 *             data:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The ID of the manuscript object
 *     SectionOrderValidationResult:
 *       allOf:
 *         - $ref: '#/components/schemas/ValidationResult'
 *         - type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [section-order]
 *               description: validates the order of the mandatory sections
 *             data:
 *               type: object
 *               properties:
 *                 order:
 *                   description: the correct order of the mandatory sections
 *                   type: array
 *                   items:
 *                     type: string
 *     FigureFormatValidationResult:
 *       allOf:
 *         - $ref: '#/components/schemas/ValidationResult'
 *         - type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [figure-format-validation]
 *               description: validates the format of the figure
 *             data:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: the ID of the manuscript object
 *                 contentType:
 *                    type: string
 *                    description: the contentType of the figure
 *     CountValidationResult:
 *       allOf:
 *         - $ref: '#/components/schemas/ValidationResult'
 *         - type: object
 *           properties:
 *             type:
 *               type: string
 *               enum:
 *                 - manuscript-maximum-characters
 *                 - manuscript-minimum-characters
 *                 - manuscript-maximum-words
 *                 - manuscript-minimum-words
 *                 - section-maximum-characters
 *                 - section-minimum-characters
 *                 - section-maximum-words
 *                 - section-minimum-words
 *                 - manuscript-title-maximum-characters
 *                 - manuscript-title-minimum-characters
 *                 - manuscript-title-maximum-words
 *                 - manuscript-title-minimum-words
 *                 - manuscript-maximum-figures
 *                 - manuscript-maximum-tables
 *                 - manuscript-maximum-combined-figure-tables
 *                 - manuscript-maximum-references
 *                 - figure-minimum-width-resolution
 *                 - figure-maximum-width-resolution
 *                 - figure-minimum-height-resolution
 *                 - figure-maximum-height-resolution
 *               description:
 *                 validates the counting requirements
 *             data:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *                   description: current number
 *                 value:
 *                   type: number
 *                   description: required number
 *                 id:
 *                   type: string
 *                   description: The ID of the manuscript object
 *                   required: false
 */
export const validateManuscript = Router().post(
  '/validate/manuscript',
  authentication,
  upload.single('file'),
  chooseManuscriptID,
  celebrate({
    body: {
      manuscriptID: Joi.string().required(),
      templateID: Joi.string().required(),
    },
  }),
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    const { manuscriptID, templateID } = req.body as {
      manuscriptID: string
      templateID: string
    }

    const dir = req.tempDir

    logger.debug(`Extracting ZIP archive to ${dir}`)
    await unzip(req.file.stream, dir)

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
