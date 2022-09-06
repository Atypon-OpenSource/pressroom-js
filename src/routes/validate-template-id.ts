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
import { templateModelMap } from '@manuscripts/requirements'
import { celebrate, Joi } from 'celebrate'
import { Router } from 'express'

import { authentication } from '../lib/authentication'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /validate/templateId/:templateId:
 *   post:
 *     description: Validate a templateId against a predefined list of templates
 *     produces:
 *       - application/json
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: "template found"
 *       404:
 *         description: "template not found"
 */
export const validateTemplateId = Router().post(
  '/validate/templateId/:templateId',
  authentication,
  celebrate({
    params: {
      templateId: Joi.string().required(),
    },
  }),
  wrapAsync(async (req, res) => {
    const { templateId } = req.params
    const template = templateModelMap.get(templateId)
    if (!template) {
      res.status(404).send({ found: 'false' })
    } else {
      res.status(200).send({ found: 'true' })
    }
  })
)
