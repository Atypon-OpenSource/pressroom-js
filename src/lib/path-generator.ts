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

import { XLINK_NAMESPACE } from './data'
import {
  BasicAttachmentData,
  ExternalFilesData,
  findImageRepresentation,
} from './external-files'

export const createArchivePathGenerator = (
  dir: string,
  archive: Archiver,
  externals: ExternalFilesData,
  allowMissingImages = false,
  prefix = 'Data/'
): MediaPathGenerator => {
  const mediaPaths = new Map<string, string>()

  return async (element, parentID) => {
    const href = element.getAttributeNS(XLINK_NAMESPACE, 'href')
    if (!href) {
      throw new Error('Media element has no href value')
    }

    const { name, ext } = path.parse(href)

    // external files
    const figure = externals.figuresMap.get(name.replace('_', ':'))
    const url = findImageRepresentation(figure)
    const externalFileName =
      url && externals.externalFilesMap.get(url)?.filename

    // already handled
    if (mediaPaths.has(name)) {
      return mediaPaths.get(name) as string
    }
    const oldPath = externalFileName
      ? `Data/${externalFileName}`
      : `Data/${name}`
    // Rename file to match id if available
    let newPath = parentID ? `${prefix}${parentID}${ext}` : oldPath
    if (externalFileName) {
      newPath = `graphic/${externalFileName}`
    }
    mediaPaths.set(name, newPath)
    // make sure the file exists at the old path
    if (fs.existsSync(`${dir}/${oldPath}`)) {
      archive.append(fs.createReadStream(`${dir}/${oldPath}`), {
        name: newPath,
      })
    } else if (!allowMissingImages) {
      throw createHttpError(
        400,
        `No data file found at ${oldPath} for ${parentID}`
      )
    }
    return newPath
  }
}

export const createAttachmentPathGenerator = (
  dir: string,
  archive: Archiver,
  figuresMap: Map<string, Figure>,
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

    const { name, ext } = path.parse(href)

    const figure = figuresMap.get(name.replace('_', ':'))
    const url = findImageRepresentation(figure)
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
