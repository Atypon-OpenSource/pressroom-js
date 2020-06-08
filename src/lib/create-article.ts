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
import {
  ContainedModel,
  Decoder,
  ManuscriptNode,
} from '@manuscripts/manuscript-transform'

export const createArticle = (
  data: ContainedModel[],
  manuscriptID: string
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

  const decoder = new Decoder(modelMap)

  const article = decoder.createArticleNode(manuscriptID)

  return { article, decoder, modelMap, manuscriptModels }
}
