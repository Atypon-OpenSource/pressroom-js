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
import customTemplateModels from '@manuscripts/data/dist/shared/custom-templates.json'
import categories from '@manuscripts/data/dist/shared/section-categories.json'
import templateModels from '@manuscripts/data/dist/shared/templates-v2.json'
import { Model, SectionCategory } from '@manuscripts/manuscripts-json-schema'

import testTemplates from '../../routes/__tests__/__fixtures__/templates.json'

// TODO: fetch dynamic template data from Couchbase?

const buildTemplateModelMap = (): Map<string, Model> => {
  const map = new Map<string, Model>()

  for (const model of templateModels as Model[]) {
    map.set(model._id, model)
  }

  for (const model of customTemplateModels as Model[]) {
    map.set(model._id, model)
  }
  if (process.env.NODE_ENV !== 'production') {
    //For Debugging
    for (const model of testTemplates as Model[]) {
      map.set(model._id, model)
    }
  }

  return map
}

const buildSectionCategoriesMap = (): Map<string, SectionCategory> => {
  const map = new Map<string, SectionCategory>()
  for (const category of categories as SectionCategory[]) {
    map.set(category._id, category)
  }

  return map
}

export const sectionCategoriesMap = buildSectionCategoriesMap()
export const templateModelMap = buildTemplateModelMap()
