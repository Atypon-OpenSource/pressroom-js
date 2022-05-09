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
import fs from 'fs-extra'
import createHttpError from 'http-errors'
import path from 'path'

import { createArticle } from './create-article'
import { createHTML } from './create-html'
import {
  AttachmentData,
  generateAttachmentsMap,
  generateFiguresMap,
  replaceHTMLImgReferences,
} from './external-files'
import { logger } from './logger'
import { prince } from './prince'

const insertFootnotesInline = (doc: Document) => {
  const inlineFootnotes = doc.querySelectorAll('span.footnote')
  inlineFootnotes.forEach((fn) => {
    const rid = fn.getAttribute('data-reference-id')
    if (rid) {
      const footnote = doc.getElementById(rid)
      const inlineFootnote = doc.createElement('span')

      if (footnote) {
        inlineFootnote.classList.add('footnote')
        inlineFootnote.textContent = footnote.textContent
        fn.replaceWith(inlineFootnote)
      }
    }
  })
  return doc
}

export const createPrincePDF = async (
  dir: string,
  data: Array<ContainedModel>,
  manuscriptID: string,
  imageDir = 'graphic',
  attachments: Array<AttachmentData>,
  theme?: string
): Promise<string> => {
  const { article, modelMap } = createArticle(data, manuscriptID)

  const html = await createHTML(article, modelMap, {
    mediaPathGenerator: async (element) => {
      const src = element.getAttribute('src')

      const { name } = path.parse(src as string)

      return `${imageDir}/${name}`
    },
  })

  const parsedHTML = new DOMParser().parseFromString(
    html,
    'application/xhtml+xml'
  )
  const figuresMap = generateFiguresMap(data)
  const attachmentsMap = generateAttachmentsMap(attachments)
  const HTMLDoc = await replaceHTMLImgReferences(
    parsedHTML,
    figuresMap,
    attachmentsMap
  )

  const HTMLDocWithFootnotes = insertFootnotesInline(HTMLDoc)

  await fs.writeFile(
    dir + '/manuscript.html',
    new XMLSerializer().serializeToString(HTMLDocWithFootnotes)
  )

  const options: {
    css?: string
    js?: string
  } = {}
  if (theme) {
    const themePath = __dirname + `/../assets/themes/${theme}/`
    const cssPath = themePath + 'print.css'
    if (!fs.existsSync(cssPath)) {
      throw createHttpError(400, `${theme} theme not found`)
    }
    options.css = cssPath
    const jsPath = themePath + 'print.js'
    // ignore when there is no js file?
    if (fs.existsSync(jsPath)) {
      options.js = jsPath
    } else {
      logger.debug(`No JS file for ${theme}`)
    }
  }
  try {
    await prince(dir, 'manuscript.html', 'manuscript.pdf', options)

    return `${dir}/manuscript.pdf`
  } catch (e) {
    throw new Error('unable to create pdf via prince-html')
  }
}
