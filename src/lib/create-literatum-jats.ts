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
import createHttpError from 'http-errors'
import { parseXml } from 'libxmljs2'

import { createArticle } from './create-article'
import { createJATSXML } from './create-jats-xml'
import {
  exportExternalFiles,
  generateFiguresWithExternalFiles,
} from './external-files'

export const createLiteratumJats = async (
  manuscriptID: string,
  data: Array<ContainedModel>,
  doi: string,
  supplementaryMaterialDOIs: Array<{ url: string; doi: string }>,
  frontMatterOnly: boolean
): Promise<Document> => {
  const { article, modelMap } = createArticle(data, manuscriptID)
  // create JATS XML
  const xml = await createJATSXML(article.content, modelMap, manuscriptID, {
    doi,
    frontMatterOnly,
  })

  const parsedJATS = new DOMParser().parseFromString(xml, 'application/xml')

  const supplementaryDOI = new Map<string, string>(
    supplementaryMaterialDOIs.map((el) => [el.url, el.doi])
  )
  const { figuresMap, externalFilesMap } = generateFiguresWithExternalFiles(
    data
  )

  const jats = await exportExternalFiles(
    parsedJATS,
    figuresMap,
    externalFilesMap,
    supplementaryDOI
  )

  // Validate against JATS DTD for early error detection
  const { errors } = parseXml(new XMLSerializer().serializeToString(jats), {
    dtdload: true,
    dtdvalid: true,
    nonet: true,
  })

  if (errors.length) {
    throw createHttpError(500, errors.toString())
  }

  return jats
}
