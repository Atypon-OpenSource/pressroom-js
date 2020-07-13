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
import archiver from 'archiver'
import { Router } from 'express'

import { confirmProjectAccess } from '../lib/confirm-project-access'
import { createArticle } from '../lib/create-article'
import { createHTML } from '../lib/create-html'
import { createJATSXML } from '../lib/create-jats-xml'
import { createJSON } from '../lib/create-json'
import { fetchProjectData } from '../lib/fetch-project-data'
import { jwtAuthentication } from '../lib/jwt-authentication'
import { sendArchive } from '../lib/send-archive'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /build/picker-bundle/{projectID}/{manuscriptID}:
 *   post:
 *     description: Fetch manuscript data and export XML + HTML for file buildPickerBundle
 *     produces:
 *       - application/zip
 *     parameters:
 *       - name: projectID
 *         description: Project ID
 *         in: path
 *         required: true
 *         type: string
 *       - name: manuscriptID
 *         description: Manuscript ID
 *         in: path
 *         required: true
 *         type: string
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Conversion success
 */
export const buildPickerBundle = Router().get(
  '/build/picker-bundle/:projectID/:manuscriptID',
  jwtAuthentication('export'),
  confirmProjectAccess,
  wrapAsync(async (req, res) => {
    const { projectID, manuscriptID } = req.params

    // prepare the output ZIP
    const archive = archiver.create('zip')

    // fetch the project data from Couchbase
    const data = await fetchProjectData(archive, projectID)

    // parse the data
    const { article, manuscriptModels, modelMap } = createArticle(
      data,
      manuscriptID
    )

    // output JSON
    archive.append(createJSON(manuscriptModels), {
      name: 'index.manuscript-json',
    })

    // output XML
    archive.append(await createJATSXML(article, modelMap), {
      name: 'manuscript.xml',
    })

    // output HTML
    archive.append(createHTML(article, modelMap), { name: 'manuscript.html' })

    await archive.finalize()

    sendArchive(res, archive)
  })
)
