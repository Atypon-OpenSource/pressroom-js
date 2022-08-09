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
import { MediaPathGenerator } from '@manuscripts/manuscript-transform'
import { Figure } from '@manuscripts/manuscripts-json-schema'
import { Archiver } from 'archiver'
import fs from 'fs-extra'
import createHttpError from 'http-errors'
import path from 'path'

import { BasicAttachmentData, findImageRepresentation } from './attachments'
import { XLINK_NAMESPACE } from './data'

export const createAttachmentPathGenerator = (
  dir: string,
  archive: Archiver,
  graphicsMap: Map<string, Figure>,
  attachmentsMap: Map<string, BasicAttachmentData>,
  allowMissingImages = false,
  prefix = 'Data/'
): MediaPathGenerator => {
  const mediaPaths = new Map<string, string>()
  return async (element, parentID) => {
    const href = element.getAttributeNS(XLINK_NAMESPACE, 'href')
    if (!href) {
      throw new Error('Media element has no href value')
    }

    if (href.startsWith('attachment')) {
      const attachment = attachmentsMap.get(href)
      return attachment ? attachment.name : href
    }

    const { name, ext } = path.parse(href)

    const graphic = graphicsMap.get(name.replace('_', ':'))
    const url = findImageRepresentation(graphic)
    const attachmentName = url && attachmentsMap.get(url)?.name

    // already handled
    if (mediaPaths.has(name)) {
      return mediaPaths.get(name) as string
    }
    const oldPath = attachmentName ? `Data/${attachmentName}` : `Data/${name}`
    // Rename file to match id if available
    let newPath = parentID ? `${prefix}${parentID}${ext}` : oldPath
    if (attachmentName) {
      newPath = `graphic/${attachmentName}`
    }
    mediaPaths.set(name, newPath)

    if (fs.existsSync(`${dir}/${oldPath}`)) {
      archive.append(fs.createReadStream(`${dir}/${oldPath}`), {
        name: newPath,
      })
    } else if (!allowMissingImages) {
      throw createHttpError(
        400,
        `No attachment ID found at ${url} for ${parentID}`
      )
    }

    return url || newPath
  }
}

export const createHTMLArchivePathGenerator = (
  dir: string,
  archive: Archiver,
  prefix = 'Data/'
): MediaPathGenerator => {
  const mediaPaths = new Map<string, string>()

  return async (element, parentID) => {
    const src = element.getAttribute('src')

    if (!src) {
      throw new Error('Media element has no src value')
    }

    const { ext, name } = path.parse(src)

    const oldPath = `Data/${name}`

    // already handled
    if (mediaPaths.has(oldPath)) {
      return mediaPaths.get(oldPath) as string
    }

    // make sure the file exists at the old path
    if (!(await fs.pathExists(`${dir}/${oldPath}`))) {
      throw new Error(`No data file found at ${oldPath} for ${parentID}`)
    }

    // Rename file to match id if available
    const newPath = parentID ? `${prefix}${name}${ext}` : oldPath

    archive.append(fs.createReadStream(`${dir}/${oldPath}`), {
      name: newPath,
    })

    mediaPaths.set(name, newPath)

    return newPath
  }
}
