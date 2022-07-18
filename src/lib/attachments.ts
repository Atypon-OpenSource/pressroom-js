/*!
 * © 2022 Atypon Systems LLC
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
  Figure,
  FigureElement,
  ObjectTypes,
} from '@manuscripts/manuscripts-json-schema'
import createHttpError from 'http-errors'

import { processElements, XLINK_NAMESPACE } from './data'
import { logger } from './logger'

export interface BasicAttachmentData {
  url: string
  name: string
}

export interface AttachmentData {
  url: string
  name: string
  designation: string
  description: string
  MIME: string
}

export type FiguresAndAttachmentsData = {
  figuresMap: Map<string, FigureElement>
}

export const generateFiguresMap = (
  data: Array<ContainedModel>
): Map<string, FigureElement> => {
  const figures = data.filter(
    (el) => el.objectType == ObjectTypes.FigureElement
  ) as Array<FigureElement>
  const figuresMap = new Map<string, FigureElement>()
  for (const figure of figures) {
    figuresMap.set(figure._id, figure)
  }
  return figuresMap
}

export const generateGraphicsMap = (
  data: Array<ContainedModel>
): Map<string, Figure> => {
  const graphics = data.filter(
    (el) => el.objectType == ObjectTypes.Figure
  ) as Array<Figure>
  const graphicsMap = new Map<string, Figure>()
  for (const graphic of graphics) {
    graphicsMap.set(graphic._id, graphic)
  }
  return graphicsMap
}

export const generateAttachmentsMap = (
  attachments: Array<AttachmentData>
): Map<string, AttachmentData> => {
  const attachmentsMap = new Map<string, AttachmentData>()
  for (const attachment of attachments) {
    attachmentsMap.set(attachment.url, attachment)
  }

  return attachmentsMap
}

export const generateBasicAttachmentsMap = (
  attachments: BasicAttachmentData[]
): Map<string, BasicAttachmentData> => {
  const attachmentsMap = new Map<string, BasicAttachmentData>()
  attachments.forEach((a) => attachmentsMap.set(a.url, a))
  return attachmentsMap
}

export const exportAttachments = async (
  document: Document,
  figures: Map<string, FigureElement>,
  graphics: Map<string, Figure>,
  attachmentsMap: Map<string, AttachmentData>,
  supplementaryDOI: Map<string, string>
): Promise<Document> => {
  const articleMeta = document.querySelector('article-meta')
  for (const [, figure] of figures) {
    const graphicIDs = figure.containedObjectIDs.filter((i) =>
      i.startsWith('MPFigure')
    )
    for (const graphicID of graphicIDs) {
      await processElements(
        document,
        `//graphic[starts-with(@xlink:href,"graphic/${graphicID.replace(
          ':',
          '_'
        )}")]`,
        async (graphic) => {
          const url = findImageRepresentation(graphics.get(graphicID))
          if (url) {
            const attachment = attachmentsMap.get(url)
            if (!attachment) {
              return
            }

            const imageName = attachment.name
            graphic.setAttributeNS(XLINK_NAMESPACE, 'href', imageName)
          }

          const parentFigure = graphic.closest('fig')
          if (!parentFigure) {
            logger.error('graphic not wrapped inside a fig element')
            return
          }

          if (figure.alternatives) {
            const interactiveHtml: Array<string> = []
            const downloadable: Array<string> = []
            figure.alternatives.forEach(({ src }) => {
              const attachment = attachmentsMap.get(src)
              if (!attachment) {
                return
              }
              if (attachment.designation === 'interactive-html') {
                interactiveHtml.push(src)
              } else {
                downloadable.push(src)
              }
            })

            if (downloadable.length > 0) {
              const caption = document.createElement('caption')
              caption.setAttribute('content-type', 'supplementary-material')
              downloadable.forEach((url) => {
                const attachment = attachmentsMap.get(url)
                if (attachment) {
                  const inlineSupplementary = createInlineSupplementaryMaterial(
                    attachment,
                    document
                  )
                  caption.appendChild(inlineSupplementary)
                }
                parentFigure.insertBefore(caption, graphic)
              })
            }

            if (interactiveHtml.length > 0) {
              const alternatives = document.createElement('alternatives')
              const clone = graphic.cloneNode(true)
              alternatives.appendChild(clone)
              interactiveHtml.forEach((url) => {
                const attachment = attachmentsMap.get(url)
                if (attachment) {
                  const supplementary = createSupplementaryMaterial(
                    attachment,
                    document
                  )
                  const objectID = supplementaryDOI.get(url)
                  if (objectID) {
                    const objectIDNode = buildObjectID(objectID)
                    supplementary.appendChild(objectIDNode)
                  } else {
                    throw createHttpError(400, `DOI for ${url} not found`)
                  }
                  if (articleMeta) {
                    articleMeta.appendChild(supplementary.cloneNode(true))
                  }
                  alternatives.appendChild(supplementary)
                }
              })
              graphic.replaceWith(alternatives)
            }
          }
        }
      )
    }
  }

  return document
}

export const replaceHTMLImgReferences = async (
  document: Document,
  graphics: Map<string, Figure>,
  attachmentsMap: Map<string, AttachmentData>
): Promise<Document> => {
  for (const [, graphic] of graphics) {
    const name = graphic._id.replace(':', '_')
    await processElements(
      document,
      `//img[contains(@src,"${name}")]`,
      async (graphic: Element) => {
        const src = graphic.getAttribute('src')
        if (src) {
          const staticImage = attachmentsMap.get(src)
          if (staticImage) {
            const imageName = staticImage.name
            graphic.setAttribute('src', imageName)
          }
        }
      }
    )
  }
  return document
}

function buildObjectID(doi: string) {
  const objectID = new DOMParser().parseFromString(
    '<object-id pub-id-type="doi" specific-use="metadata"></object-id>',
    'application/xml'
  ).firstElementChild
  if (objectID) {
    objectID.textContent = doi
    return objectID
  }
  throw new Error('Unable to create object id for ' + doi)
}

const createInlineSupplementaryMaterial = (
  attachment: AttachmentData,
  document: Document
): Element => {
  const supplementaryMaterial = document.createElement(
    'inline-supplementary-material'
  )
  setSupplementaryMaterialAttributes(supplementaryMaterial, attachment)
  const rootParagraph = document.createElement('p')

  rootParagraph.appendChild(supplementaryMaterial)
  return rootParagraph
}

const createSupplementaryMaterial = (
  attachment: AttachmentData,
  document: Document
): Element => {
  const supplementaryMaterial = document.createElement('supplementary-material')

  setSupplementaryMaterialAttributes(supplementaryMaterial, attachment)
  return supplementaryMaterial
}

const setSupplementaryMaterialAttributes = (
  supplementaryMaterial: Element,
  attachment: AttachmentData
) => {
  supplementaryMaterial.setAttribute('mimetype', attachment.MIME)
  supplementaryMaterial.setAttributeNS(
    XLINK_NAMESPACE,
    'href',
    `external/${attachment.name}`
  )
  supplementaryMaterial.setAttribute('content-type', attachment.designation)
  if (attachment.description) {
    supplementaryMaterial.textContent = attachment.description
  }
}

export const findImageRepresentation = (
  graphic: Figure | undefined
): string | undefined => (graphic ? graphic.src : undefined)
