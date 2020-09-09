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
import sectionCategories from '@manuscripts/data/dist/shared/section-categories.json'
import { SectionCategory } from '@manuscripts/manuscripts-json-schema'

import { buildModelMap } from '../models'
import { ValidationResult } from './types'

const sectionCategoriesMap = buildModelMap<SectionCategory>(
  sectionCategories as SectionCategory[]
)

export const validationMessage = (result: ValidationResult): string => {
  switch (result.type) {
    case 'required-section': {
      const category = sectionCategoriesMap.get(
        result.data.sectionDescription.sectionCategory
      ) as SectionCategory

      return `There must be a ${category.name} section`
    }

    case 'manuscript-maximum-characters':
      return `The manuscript must have less than ${result.data.value} characters`

    case 'manuscript-minimum-characters':
      return `The manuscript must have more than ${result.data.value} characters`

    case 'manuscript-maximum-words':
      return `The manuscript must have less than ${result.data.value} words`

    case 'manuscript-minimum-words':
      return `The manuscript must have more than ${result.data.value} words`

    case 'section-maximum-characters':
      return `The section must have less than ${result.data.value} characters`

    case 'section-minimum-characters':
      return `The section must have more than ${result.data.value} characters`

    case 'section-maximum-words':
      return `The section must have less than ${result.data.value} words`

    case 'section-minimum-words':
      return `The section must have more than ${result.data.value} words`

    case 'manuscript-title-maximum-characters':
      return `The manuscript title must have less than ${result.data.value} characters`

    case 'manuscript-title-minimum-characters':
      return `The manuscript title must have more than ${result.data.value} characters`

    case 'manuscript-title-maximum-words':
      return `The manuscript title must have less than ${result.data.value} words`

    case 'manuscript-title-minimum-words':
      return `The manuscript title must have more than ${result.data.value} words`

    default:
      return 'Requirement did not pass'
  }
}
