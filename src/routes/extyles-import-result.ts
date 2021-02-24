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

import { arcCredentials } from '../lib/arc-credentials'
import { authentication } from '../lib/authentication'
import { convertJATSArc } from '../lib/convert-jats-arc'
import { getResult, isFinishedJob, login } from '../lib/extyles-arc'
import { sendArchive } from '../lib/send-archive'
import { createRequestDirectory } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'
/**
 * @swagger
 *
 * /extyles/import-result:
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
 *                job_id:
 *                  type: string
 *     responses:
 *       200:
 *         description: if the job finished return a .manuproj archive
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 */
export const extylesImportResult = Router().post(
  '/extyles/import-result',
  authentication,
  arcCredentials,
  upload.single('job_id'),
  celebrate({
    body: {
      job_id: Joi.number().required(),
    },
  }),
  wrapAsync(async (req, res) => {
    const { job_id } = req.body as {
      job_id: string
    }
    const token = await login(req.user.arc)

    const isFinished = await isFinishedJob(job_id, token)
    console.log(isFinished)
    if (!isFinished) {
      res.json({ message: 'Job not finished yet' })
    } else {
      createRequestDirectory(req, res, async () => {
        const dir = req.tempDir
        const zip = await getResult(job_id, token)
        // unzip the input
        await unzip(zip, dir)

        const archive = await convertJATSArc(dir)

        sendArchive(res, archive, 'manuscript.manuproj')
      })
    }
  })
)
