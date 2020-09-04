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
import { Router } from 'express'
import { writeFile } from 'fs-extra'
import getStream from 'get-stream'

import { parseReferences } from '../lib/anystyle'
import { jwtAuthentication } from '../lib/jwt-authentication'
import { createRequestDirectory } from '../lib/temp-dir'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /convert/references-anystyle:
 *   post:
 *     description: Convert plain text references to CSL-JSON
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                file:
 *                  type: string
 *                  format: binary
 *            encoding:
 *              file:
 *                contentType: text/plain
 *     responses:
 *       200:
 *         description: Conversion success
 *         content:
 *           application/json:
 *            schema:
 *              type: object
 *
 */
export const convertReferencesAnyStyle = Router().post(
  '/convert/references-anystyle',
  jwtAuthentication('pressroom-js'),
  upload.single('file'),
  createRequestDirectory,
  wrapAsync(async (req, res) => {
    const inputFile = req.tempDir + '/references.txt'

    await writeFile(inputFile, await getStream(req.file.stream))

    const output = await parseReferences(inputFile)

    res.json(output)
  })
)
