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
  MandatorySubsectionsRequirement,
  ManuscriptTemplate,
  Model,
  ObjectTypes,
} from '@manuscripts/manuscripts-json-schema'

import { FigureFormat } from '../../types/formats'
import { templateModelMap } from './templates'
import {
  CombinedFigureTableCountRequirements,
  CountRequirement,
  CountRequirementModel,
  CountRequirements,
  FigureCountRequirements,
  ReferenceCountRequirements,
  RequiredSections,
  SectionCountRequirements,
  SectionDescriptionCountProperty,
  SectionTitleRequirement,
  TableCountRequirements,
} from './types'

const getRequiredSubSectionsRequirements = (template: ManuscriptTemplate) => {
  const subSectionsRequirementIds = template.mandatorySectionRequirements || []
  return getRequirements(subSectionsRequirementIds)
}

const getRequirements = (requirementIds: Array<string>) => {
  const requirements: Array<Model> = []
  requirementIds.forEach((id: string) => {
    const requirement = getRequirement(id)
    if (requirement) {
      requirements.push(requirement)
    }
  })
  return requirements
}

const getRequirement = (requirementId: string) => {
  return templateModelMap.get(requirementId)
}

const findCountRequirement = (
  objectType: ObjectTypes,
  requirementField: keyof ManuscriptTemplate,
  template: ManuscriptTemplate
) => {
  const requirementId = template[requirementField]

  if (requirementId) {
    if (typeof requirementId !== 'string') {
      throw (
        'Count requirement is expected to have an ID associated with it. Found : ' +
        typeof requirementId
      )
    }
    const requirement = getRequirement(requirementId)
    if (requirement && requirement.objectType !== objectType) {
      throw (
        'Found requirement of a different type. Found:' +
        requirement.objectType +
        ',expected: ' +
        objectType
      )
    }
    const { count, ignored, severity } = requirement as CountRequirementModel

    if (!ignored && count !== undefined) {
      return { count, severity }
    }
  }
}

export const buildRequiredSections = (
  template: ManuscriptTemplate
): RequiredSections => {
  const requiredSections: RequiredSections = []
  const requirements = getRequiredSubSectionsRequirements(template)

  requirements.forEach((requirement) => {
    const {
      severity,
      embeddedSectionDescriptions,
    } = requirement as MandatorySubsectionsRequirement

    for (const sectionDescription of embeddedSectionDescriptions) {
      if (sectionDescription.required) {
        requiredSections.push({
          sectionDescription,
          severity,
        })
      }
    }
  })
  return requiredSections
}

export const buildManuscriptCountRequirements = (
  template: ManuscriptTemplate
): CountRequirements => {
  return {
    characters: {
      max: findCountRequirement(
        ObjectTypes.MaximumManuscriptCharacterCountRequirement,
        'maxCharacterCountRequirement',
        template
      ),
      min: findCountRequirement(
        ObjectTypes.MinimumManuscriptCharacterCountRequirement,
        'minCharacterCountRequirement',
        template
      ),
    },
    words: {
      max: findCountRequirement(
        ObjectTypes.MaximumManuscriptWordCountRequirement,
        'maxWordCountRequirement',
        template
      ),
      min: findCountRequirement(
        ObjectTypes.MinimumManuscriptWordCountRequirement,
        'minWordCountRequirement',
        template
      ),
    },
  }
}

export const buildTitleCountRequirements = (
  template: ManuscriptTemplate
): CountRequirements => {
  return {
    characters: {
      max: findCountRequirement(
        ObjectTypes.MaximumManuscriptTitleCharacterCountRequirement,
        'maxManuscriptTitleCharacterCountRequirement',
        template
      ),
      min: findCountRequirement(
        ObjectTypes.MinimumManuscriptTitleCharacterCountRequirement,
        'minManuscriptTitleCharacterCountRequirement',
        template
      ),
    },
    words: {
      max: findCountRequirement(
        ObjectTypes.MaximumManuscriptTitleWordCountRequirement,
        'maxManuscriptTitleWordCountRequirement',
        template
      ),
      min: findCountRequirement(
        ObjectTypes.MinimumManuscriptTitleWordCountRequirement,
        'minManuscriptTitleWordCountRequirement',
        template
      ),
    },
  }
}

export const buildFigureCountRequirements = (
  template: ManuscriptTemplate
): FigureCountRequirements => {
  return {
    figures: {
      max: findCountRequirement(
        ObjectTypes.MaximumFigureCountRequirement,
        // @ts-ignore (TODO)
        'maxFigureCountRequirement',
        template
      ),
    },
  }
}

export const buildTableCountRequirements = (
  template: ManuscriptTemplate
): TableCountRequirements => {
  return {
    tables: {
      max: findCountRequirement(
        ObjectTypes.MaximumTableCountRequirement,
        'maxTableCountRequirement',
        template
      ),
    },
  }
}

export const buildCombinedFigureTableCountRequirements = (
  template: ManuscriptTemplate
): CombinedFigureTableCountRequirements => {
  return {
    combinedFigureTable: {
      max: findCountRequirement(
        ObjectTypes.MaximumCombinedFigureTableCountRequirement,
        'maxCombinedFigureTableCountRequirement',
        template
      ),
    },
  }
}

export const buildSectionTitleRequirements = (
  template: ManuscriptTemplate
): Array<SectionTitleRequirement> => {
  const sectionTitleRequirements: Array<SectionTitleRequirement> = []
  const requirements = getRequiredSubSectionsRequirements(template)
  requirements.map((requirement) => {
    const {
      ignored,
      severity,
      embeddedSectionDescriptions,
    } = requirement as MandatorySubsectionsRequirement

    if (ignored) {
      return
    }
    const embeddedSectionRequirement = embeddedSectionDescriptions
      .filter((sectionDescription) => sectionDescription.title)
      .map((sectionDescription) => ({
        title: sectionDescription.title as string,
        severity,
        category: sectionDescription.sectionCategory,
      }))
    sectionTitleRequirements.push(...embeddedSectionRequirement)
  })
  return sectionTitleRequirements
}
export const buildSectionCountRequirements = (
  template: ManuscriptTemplate
): SectionCountRequirements => {
  const sectionCountRequirements: SectionCountRequirements = {}
  const requirements = getRequiredSubSectionsRequirements(template)

  requirements.forEach((requirement) => {
    const {
      ignored,
      severity,
      embeddedSectionDescriptions,
    } = requirement as MandatorySubsectionsRequirement

    if (ignored) {
      return
    }

    for (const sectionDescription of embeddedSectionDescriptions) {
      const getCountRequirement = (
        key: SectionDescriptionCountProperty
      ): CountRequirement | undefined => {
        const count = sectionDescription[key]

        if (count !== undefined) {
          return { count, severity }
        }
      }

      sectionCountRequirements[sectionDescription.sectionCategory] = {
        characters: {
          max: getCountRequirement('maxCharCount'),
          min: getCountRequirement('minCharCount'),
        },
        words: {
          max: getCountRequirement('maxWordCount'),
          min: getCountRequirement('minWordCount'),
        },
        // title: {
        //   max: getCountRequirement('maxTitleCharLength'),
        //   min: getCountRequirement('minTitleCharLength'),
        // }
        // keywords: {
        //   max: getCountRequirement('maxKeywordCount'),
        //   min: getCountRequirement('minKeywordCount'),
        // },
      }
    }
  })

  return sectionCountRequirements
}

export const getAllowedFigureFormats = (
  template: ManuscriptTemplate
): Array<FigureFormat> => {
  return template.acceptableFigureFormats
    ? (template.acceptableFigureFormats as Array<FigureFormat>)
    : []
}

export const buildManuscriptReferenceCountRequirements = (
  template: ManuscriptTemplate
): ReferenceCountRequirements => {
  return {
    references: {
      max: findCountRequirement(
        ObjectTypes.MaximumManuscriptReferenceCountRequirement,
        // @ts-ignore (TODO)
        'maxManuscriptReferenceCountRequirement',
        template
      ),
    },
  }
}
