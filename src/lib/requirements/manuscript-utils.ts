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
  getModelsByType,
  hasObjectType,
  isManuscript,
} from '@manuscripts/manuscript-transform'
import {
  Citation,
  ObjectTypes,
  Section,
} from '@manuscripts/manuscripts-json-schema'

import { FigureFormat } from '../../types/formats'

export const isSection = hasObjectType<Section>(ObjectTypes.Section)

export const getManuscriptId = (data: ContainedModel[]): string | undefined =>
  data.find((model) => model.objectType === ObjectTypes.Manuscript)?._id

export const nextPriority = (data: Array<ContainedModel>): number => {
  const priorities = data.filter(isSection).map((section) => section.priority)
  return Math.max(...priorities) + 1
}

// Returns manuscripts title or an empty string if one is not defined
export const getManuscriptTitle = (
  modelMap: Map<string, ContainedModel>,
  manuscriptId: string
): string => {
  const model = modelMap.get(manuscriptId)

  return model && isManuscript(model) ? model.title || '' : ''
}

export const countModelsByType = (
  modelMap: Map<string, ContainedModel>,
  objectType: ObjectTypes
): number => getModelsByType(modelMap, objectType).length

export const getSectionScope = (section: Section): string =>
  section.path.filter((el) => el !== section._id).join()

export const getFigureFormat = (
  contentType: string
): FigureFormat | undefined => {
  switch (contentType) {
    case 'image/jpeg':
      return 'jpeg'
    case 'image/png':
      return 'png'
    case 'image/tiff':
      return 'tiff'
    default:
      return undefined
  }
}

export const getReferences = (
  modelMap: Map<string, ContainedModel>
): Array<string> => {
  const references = new Set<string>()
  modelMap.forEach((model) => {
    if (model.objectType == ObjectTypes.Citation) {
      const citation = model as Citation
      citation.embeddedCitationItems.forEach((citationItem) =>
        references.add(citationItem.bibliographyItem)
      )
    }
  })
  return [...references]
}
