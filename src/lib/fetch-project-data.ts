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
import { ContainedModel } from '@manuscripts/manuscript-transform'
import { Archiver } from 'archiver'
import mime from 'mime-types'

import { getAttachment, getContainedResources } from './store'

export const fetchProjectData = async (
  archive: Archiver,
  projectID: string
): Promise<ContainedModel[]> => {
  const result = await getContainedResources(projectID)

  const data = []

  for (const row of result.rows) {
    const {
      _sync: { attachments },
      ...item
    } = row.projects

    item._id = row.id

    if (attachments) {
      for (const attachment of Object.values(attachments)) {
        const result = await getAttachment(attachment)
        const extension = mime.extension(attachment.content_type)
        const name = `Data/${row.id.replace(':', '_')}${
          extension ? `.${extension}` : ''
        }`
        archive.append(result.value, { name })
      }
    }

    data.push(item)
  }

  // const activeModels = selectActiveResources(data)
  // console.log(activeModels)

  return data
}
