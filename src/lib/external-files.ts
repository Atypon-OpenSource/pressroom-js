/*!
 * © 2021 Atypon Systems LLC
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
import {
  ExternalFile,
  Figure,
  ObjectTypes,
} from '@manuscripts/manuscripts-json-schema'

import { processElements, XLINK_NAMESPACE } from './data'
import { logger } from './logger'

export const importExternalFiles = async (
  document: Document,
  data: Array<ContainedModel>
): Promise<Document> => {
  const externalFiles = data.filter(
    (el) => el.objectType == ObjectTypes.ExternalFile
  ) as Array<ExternalFile>
  const externalFilesMap = new Map<string, ExternalFile>()
  for (const externalFile of externalFiles) {
    externalFilesMap.set(externalFile.publicUrl, externalFile)
  }

  const figures = data.filter(
    (el) => el.objectType == ObjectTypes.Figure
  ) as Array<Figure>
  for (const figure of figures) {
    const name = figure._id.replace(':', '_')
    await processElements(
      document,
      `//graphic[starts-with(@xlink:href,"graphic/${name}")]`,
      async (element) => {
        const parentFigure = element.closest('fig')
        if (!parentFigure) {
          logger.error('graphic not wrapped inside a fig element')
          return
        }
        if (figure.originalURL) {
          const staticImage = externalFilesMap.get(figure.originalURL)
          if (staticImage) {
            const imageName = staticImage.filename
            const nodeName = element.nodeName.toLowerCase()

            element.setAttributeNS(
              XLINK_NAMESPACE,
              'href',
              `${nodeName}/${imageName}`
            )
          }
        }
        if (figure.externalFileReferences) {
          const inlineSupplementary = figure.externalFileReferences
            .filter((el) => el.url != figure.originalURL)
            .map((el) => el.url)
          const caption = document.createElement('caption')
          caption.setAttribute('content-type', 'supplementary-material')
          inlineSupplementary.forEach((url) => {
            const externalFile = externalFilesMap.get(url)
            if (externalFile) {
              const supplementaryMaterial = document.createElement(
                'inline-supplementary-material'
              )
              supplementaryMaterial.setAttribute('mimetype', externalFile.MIME)
              supplementaryMaterial.setAttributeNS(
                XLINK_NAMESPACE,
                'href',
                `external/${externalFile.filename}`
              )
              if (externalFile.description) {
                supplementaryMaterial.textContent = externalFile.description
              }
              const paragraph = document.createElement('p')
              paragraph.appendChild(supplementaryMaterial)
              caption.appendChild(paragraph)
            }
          })
          parentFigure.insertBefore(caption, element)
        }
      }
    )
  }
  return document
}
