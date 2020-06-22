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

import { convertBibliographyToJATS } from '../lib/edifix'
import { edifixCredentials } from '../lib/edifix-credentials'
import { jwtAuthentication } from '../lib/jwt-authentication'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /convert/references-edifix:
 *   post:
 *     description: Copyedits, corrects, and links a list of references
 *     produces:
 *       - application/xml
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: edifix-secret
 *         schema:
 *           type: string
 *           format: byte
 *         required: true
 *     requestBody:
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                file:
 *                  type: string
 *                  format: binary
 *                editorialStyle:
 *                  type: string
 *            encoding:
 *              file:
 *                contentType: application/json
 *     responses:
 *       200:
 *         description: Conversion success
 */
export const convertReferencesEdifix = Router().post(
  '/convert/references-edifix',
  jwtAuthentication('pressroom-js'),
  upload.single('file'),
  celebrate({
    body: {
      editorialStyle: Joi.string().required(),
    },
    headers: Joi.object({
      'pressroom-edifix-secret': Joi.string().base64().required(),
    }).unknown(),
  }),
  edifixCredentials,
  wrapAsync(async (req, res) => {
    const { editorialStyle } = req.body as {
      editorialStyle: string
    }

    const result = await convertBibliographyToJATS(
      req.file.stream,
      editorialStyle,
      req.user.edifix
    )

    res.type('application/xml')

    result.pipe(res)
  })
)
