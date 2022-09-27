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
import { celebrate, Joi } from 'celebrate'
import { Router } from 'express'

import { authentication } from '../lib/authentication'
import { IPdf, PdfEngines } from '../lib/PDFEngines/IPdf'
import { splitEngineId } from '../lib/PDFEngines/PdfUtils'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /pdf/job/:submission_id/result:
 *   get:
 *     description: get the result pdf by submission id
 *     produces:
 *       - application/octet-stream
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: "PDF result"
 */
export const pdfJobResult = Router().get(
  '/pdf/job/:submission_id/result',
  authentication,
  celebrate({
    params: {
      submission_id: Joi.string().required(),
    },
  }),
  wrapAsync(async (req, res) => {
    const { submission_id } = req.params
    const { id, engine } = splitEngineId(submission_id)

    if (PdfEngines.has(engine)) {
      const currentEngine: IPdf = PdfEngines.get(engine)
      const buffer = await currentEngine.jobResult(id)
      res.status(200).send(buffer)
    } else {
      throw Error('Engine not supported.')
    }
  })
)
