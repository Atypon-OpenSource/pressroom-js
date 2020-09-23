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
import { ObjectTypes } from '@manuscripts/manuscripts-json-schema'
import { RequestHandler } from 'express'
import { readFile } from 'fs-extra'
import JSZip from 'jszip'

export const chooseManuscriptID: RequestHandler = async (
  req,
  res,
  next
): Promise<void> => {
  const { manuscriptID } = req.body

  if (manuscriptID === 'auto') {
    const buffer = await readFile(req.file.path)

    const zip = await new JSZip().loadAsync(buffer)

    const file = zip.file('index.manuscript-json')

    if (!file) {
      throw new Error('Could not find index.manuscript-json')
    }

    const json = await file.async('text')

    const { data } = JSON.parse(json)

    if (!Array.isArray(data)) {
      throw new Error('Could not read data array from index.manuscript-json')
    }

    const manuscript = data.find(
      (item) => item.objectType === ObjectTypes.Manuscript
    )

    if (!manuscript) {
      throw new Error('Could not find a Manuscript object')
    }

    req.body.manuscriptID = manuscript._id
  }

  next()
}
