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
  hasObjectType,
} from '@manuscripts/manuscript-transform'
import {
  Model,
  ObjectTypes,
  ParagraphStyle,
  Section,
} from '@manuscripts/manuscripts-json-schema'

export const buildModelMap = <T extends Model>(models: T[]): Map<string, T> => {
  const modelMap = new Map<string, T>()

  for (const model of models) {
    modelMap.set(model._id, model)
  }

  return modelMap
}

export const addNumberingToSections = (
  manuscriptData: Array<ContainedModel>
): void => {
  const headingStyles = manuscriptData.filter(
    (model) =>
      model.prototype && model.prototype.match('MPParagraphStyle:H[1-9]')
  ) as Array<ParagraphStyle>
  const sectionsOrder = new Map<string, string>()

  const applyToLevel = (level: number, func: (section: Section) => void) => {
    manuscriptData
      .filter(hasObjectType<Section>(ObjectTypes.Section))
      .filter((section) => section.category !== 'MPSectionCategory:abstract') // abstract will be moved to front
      .filter((section) => section.path.length == level)
      .forEach((section) => func(section))
  }

  const addNumbering = (level: number) => {
    const groupedSections = new Map<string, Array<Section>>()
    applyToLevel(level, (section) => {
      const parent = section.path[level - 2] || ''
      const sectionsList = groupedSections.get(parent)
      if (sectionsList) {
        sectionsList.push(section)
        groupedSections.set(parent, sectionsList)
      } else {
        groupedSections.set(parent, [section])
      }
    })

    for (const [parent, sections] of groupedSections) {
      let index = 1
      const parentNumber = sectionsOrder.get(parent) || ''
      sections
        .sort((s1, s2) => s1.priority - s2.priority)
        .forEach((section) => {
          const prefix = parentNumber + index++ + '.'
          sectionsOrder.set(section._id, prefix)
        })
    }
  }

  headingStyles
    .sort((hs1, hs2) =>
      hs1.preferredXHTMLElement.localeCompare(hs2.preferredXHTMLElement)
    )
    .forEach((headingStyle) => {
      const htmlTag = headingStyle.preferredXHTMLElement
      const sectionLevel = parseInt(htmlTag.slice(htmlTag.length - 1))
      addNumbering(sectionLevel)
      if (headingStyle.sectionNumberingStyle) {
        const numberingStyle = headingStyle.sectionNumberingStyle
        const { numberingScheme, suffix } = numberingStyle
        if (numberingScheme === 'decimal') {
          applyToLevel(sectionLevel, (section) => {
            let prefix = sectionsOrder.get(section._id) || '.'
            if (suffix) {
              prefix = prefix.slice(0, -1) + suffix
            }
            section.title = `${prefix} ${section.title}`
          })
        }
      }
    })
}
