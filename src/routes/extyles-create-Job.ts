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
import createHttpError from 'http-errors'

import { arcCredentials } from '../lib/arc-credentials'
import { authentication } from '../lib/authentication'
import { createJob, login } from '../lib/extyles-arc'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /extyles/create-job:
 *   post:
 *     description: Convert Word file to Manuscripts data via Arc
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *      - in: header
 *        name: pressroom-extylesarc-secret
 *        schema:
 *          type: string
 *        required: false
 *     requestBody:
 *        description: multipart form data including Word file
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                file:
 *                  type: string
 *                  format: binary
 *     responses:
 *       200:
 *         description: the job id of the process
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 */
export const extylesCreateJob = Router().post(
  '/extyles/create-job',
  authentication,
  arcCredentials,
  upload.single('file'),
  wrapAsync(async (req, res) => {
    if (!req.file) {
      throw createHttpError(400, '.docx or .doc file is required')
    }
    // @ts-ignore
    // const extension = req.file.detectedFileExtension
    const extension = req.file.clientReportedFileExtension
    if (!/^\.docx?$/.test(extension)) {
      throw createHttpError(400, 'Only .docx and .doc files are supported')
    }

    const token = await login(req.user.arc)
    // @ts-ignore
    const job_id = await createJob(req.file.stream, extension, token)

    res.json({ job_id })
  })
)
