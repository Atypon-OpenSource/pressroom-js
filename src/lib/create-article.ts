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
import { ObjectTypes, Section } from '@manuscripts/json-schema'
import {
  ContainedModel,
  Decoder,
  hasObjectType,
  ManuscriptNode,
  MissingElement,
} from '@manuscripts/transform'
import createHttpError from 'http-errors'

export const createArticle = (
  data: ContainedModel[],
  manuscriptID: string,
  options: {
    allowMissingElements: boolean
    generateSectionLabels: boolean
  } = { allowMissingElements: false, generateSectionLabels: true }
): {
  article: ManuscriptNode
  decoder: Decoder
  modelMap: Map<string, ContainedModel>
  manuscriptModels: ContainedModel[]
} => {
  const manuscriptModels = data.filter(
    // @ts-ignore
    (model) => !model.manuscriptID || model.manuscriptID === manuscriptID
  )

  const modelMap = new Map<string, ContainedModel>(
    manuscriptModels.map((model) => [model._id, model])
  )
  /* set generatedLabel for all sections to generateSectionLabels,
   * if generateSectionLabels is not preset it will default to true */
  data
    .filter(hasObjectType<Section>(ObjectTypes.Section))
    .forEach((section: Section) => {
      section.generatedLabel = options.generateSectionLabels
    })

  const decoder = new Decoder(modelMap, options.allowMissingElements)
  try {
    const article = decoder.createArticleNode(manuscriptID)
    return { article, decoder, modelMap, manuscriptModels }
  } catch (e) {
    if (e instanceof MissingElement) {
      throw createHttpError(400, e)
    } else {
      throw e
    }
  }
}
