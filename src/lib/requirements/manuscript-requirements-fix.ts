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
  buildParagraph,
  buildSection,
  ContainedModel,
  ManuscriptModel,
  placeholder,
  timestamp,
} from '@manuscripts/manuscript-transform'
import {
  ParagraphElement,
  Section,
  SectionDescription,
} from '@manuscripts/manuscripts-json-schema'
import { v4 as uuidv4 } from 'uuid'

import { logger } from '../logger'
import { isSection, nextPriority } from './manuscript-utils'
import { SectionTitleValidationResult, ValidationResult } from './types'

type RequiredSection = { section: Section; placeholder?: ParagraphElement }

export const runManuscriptFixes = (
  manuscriptData: Array<ManuscriptModel>,
  manuscriptID: string,
  results: Array<ValidationResult>
): Array<ManuscriptModel> => {
  const modelsMap = new Map(manuscriptData.map((model) => [model._id, model]))
  const failedResults = results.filter((result) => !result.passed)
  for (const result of failedResults) {
    switch (result.type) {
      case 'required-section': {
        const { data } = result
        const priority = nextPriority(manuscriptData)
        const requiredSection = addRequiredSection(
          data.sectionDescription,
          manuscriptID,
          priority
        )
        manuscriptData.push(...requiredSection)
        break
      }
      case 'section-title-match': {
        const { data } = result
        const modelToFix = modelsMap.get(data.id)
        if (modelToFix) {
          retitleSection(result, modelToFix)
        } else {
          throw new Error(`${data.id} not found`)
        }
        break
      }
      case 'section-order': {
        const { data } = result
        reorderSection(data.order, manuscriptData)
      }
    }
  }
  return manuscriptData
}

const retitleSection = (
  result: SectionTitleValidationResult,
  model: ContainedModel
) => {
  const { data } = result

  if (!isSection(model)) {
    throw new Error(`${data.id} must be of type MPSection`)
  }

  logger.debug(`Changing ${model.title} to ${data.title}`)
  model.title = data.title
}

const reorderSection = (
  orderedSections: Array<string>,
  data: Array<ContainedModel>
) => {
  const sectionsCategory = new Map(
    orderedSections.map((section, index) => [section, index])
  )
  const sectionsToFix = Array<Section>()
  data.forEach((model) => {
    if (isSection(model)) {
      const { category } = model
      if (category && sectionsCategory.has(category)) {
        sectionsToFix.push(model)
      }
    }
  })
  const sortedSections = sectionsToFix.sort((s1, s2) => {
    // Guaranteed that the section will have a category and contained in the HashMap
    const getIndex = (section: Section): number => {
      const { category } = section
      if (category) {
        return sectionsCategory.get(category) as number
      }
      return -1
    }
    return getIndex(s1) - getIndex(s2)
  })
  let priority = nextPriority(data)
  sortedSections.forEach((section) => (section.priority = priority++))
}

const createRequiredSection = (
  requirement: SectionDescription,
  manuscriptID: string,
  priority: number,
  path?: string[]
): RequiredSection => {
  const section = {
    ...createRequiredProperties(manuscriptID),
    ...buildSection(priority, path),
    title: requirement.title,
    category: requirement.sectionCategory,
  } as Section
  const requiredSection: RequiredSection = {
    section: section,
  }

  const { placeholder } = requirement
  if (placeholder) {
    const placeholderParagraph = {
      ...createRequiredProperties(manuscriptID),
      ...buildParagraph(placeholder),
    } as ParagraphElement
    section.elementIDs = [placeholderParagraph._id]
    requiredSection.placeholder = placeholderParagraph
  }
  return requiredSection
}

const createRequiredProperties = (manuscriptID: string) => {
  const createdAt = timestamp()
  return {
    containerID: 'MPProject:1', // TODO, this is a project id
    manuscriptID,
    createdAt,
    updatedAt: createdAt,
    sessionID: uuidv4().toUpperCase(),
  }
}
const addRequiredSection = (
  requirement: SectionDescription,
  manuscriptID: string,
  priority: number
): Array<ManuscriptModel> => {
  const parentSection = createRequiredSection(
    requirement,
    manuscriptID,
    priority
  )
  let manuscriptsModels: Array<ManuscriptModel> = [parentSection.section]
  if (parentSection.placeholder) {
    manuscriptsModels.push(parentSection.placeholder)
  }
  const { subsections } = requirement
  if (subsections) {
    let priority = 0
    manuscriptsModels = subsections
      .map((subsection) =>
        createRequiredSection(
          subsection as SectionDescription,
          manuscriptID,
          ++priority,
          [parentSection.section._id]
        )
      )
      .reduce((models, requiredSection) => {
        models.push(requiredSection.section)
        if (requiredSection.placeholder) {
          models.push(placeholder)
        }
        return models
      }, manuscriptsModels)
  }

  return manuscriptsModels
}
