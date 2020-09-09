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
  isSectionNode,
  ManuscriptNode,
} from '@manuscripts/manuscript-transform'
import {
  BibliographyItem,
  Figure,
  ManuscriptTemplate,
  ObjectTypes,
  Section,
} from '@manuscripts/manuscripts-json-schema'

import { FigureFormat } from '../../types/formats'
import { createArticle } from '../create-article'
import { isValidDOI } from '../doi'
import { BadRequestError } from '../errors'
import { buildText, countCharacters, countWords } from '../statistics'
import {
  countModelsByType,
  getFigureFormat,
  getManuscriptId,
  getManuscriptTitle,
  getReferences,
  getSectionScope,
} from './manuscript-utils'
import {
  buildCombinedFigureTableCountRequirements,
  buildFigureCountRequirements,
  buildManuscriptCountRequirements,
  buildManuscriptReferenceCountRequirements,
  buildRequiredSections,
  buildSectionCountRequirements,
  buildSectionTitleRequirements,
  buildTableCountRequirements,
  buildTitleCountRequirements,
  getAllowedFigureFormats,
} from './requirements'
import { sectionCategoriesMap } from './templates'
import {
  BibliographyValidationResult,
  CombinedFigureTableCountRequirements,
  CountRequirement,
  CountRequirements,
  Counts,
  CountValidationResult,
  CountValidationType,
  FigureCountRequirements,
  FigureFormatValidationResult,
  FigureValidationType,
  ReferenceCountRequirements,
  RequiredSections,
  RequiredSectionValidationResult,
  SectionBodyValidationResult,
  SectionCategoryValidation,
  SectionCountRequirements,
  SectionOrderValidationResult,
  Sections,
  SectionTitleRequirement,
  SectionTitleValidationResult,
  TableCountRequirements,
  ValidationResult,
} from './types'

const iterateChildren = function* (
  node: ManuscriptNode,
  recurse = false
): Iterable<ManuscriptNode> {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i)
    yield child

    if (recurse) {
      for (const grandchild of iterateChildren(child, true)) {
        yield grandchild
      }
    }
  }
}

const buildSections = async (
  article: ManuscriptNode,
  modelMap: Map<string, ContainedModel>,
  recurse = false
): Promise<Sections> => {
  const output: Sections = new Map()

  for (const node of iterateChildren(article, recurse)) {
    if (isSectionNode(node)) {
      const { category, id } = node.attrs
      if (category) {
        const sections = output.get(category) || []

        const text = buildText(node)

        const counts = {
          characters: await countCharacters(text),
          words: await countWords(text),
        }
        const section = modelMap.get(id) as Section
        sections.push({ node, counts, section })

        output.set(category, sections)
      }
    }
  }

  return output
}

const validateSectionsCategory = async function* (
  sectionsWithCategory: Sections
): AsyncGenerator<SectionCategoryValidation> {
  for (const [dataCategory, dataSections] of sectionsWithCategory) {
    const category = sectionCategoriesMap.get(dataCategory)
    if (category && category.uniqueInScope) {
      const scopes = new Set()
      for (const { section } of dataSections) {
        const scope = getSectionScope(section)
        if (scopes.has(scope)) {
          yield {
            type: 'section-category-uniqueness',
            passed: false,
            data: { id: section._id },
            severity: 0,
          }
        } else {
          scopes.add(scope)
        }
      }
    }
  }
}

const validateSectionBody = async function* (
  sectionsWithCategory: Sections
): AsyncGenerator<SectionBodyValidationResult> {
  for (const [, category] of sectionsWithCategory) {
    for (const { section, node } of category) {
      yield {
        type: 'section-body-has-content',
        passed: containsBodyContent(node),
        severity: 0, // What severity it should be?
        data: { id: section._id },
      }
    }
  }
}

export const containsBodyContent = (sectionNode: ManuscriptNode): boolean => {
  let hasContent = false
  sectionNode.descendants((childNode: ManuscriptNode) => {
    if (childNode.type && childNode.type.name) {
      const nodeType = childNode.type.name
      if (nodeType === 'inline_equation' || nodeType === 'equation') {
        if (childNode.attrs && childNode.attrs.TeXRepresentation) {
          hasContent = true
        }
      } else if (nodeType === 'figure_element') {
        hasContent = true
      } else if (
        nodeType !== 'section_title' &&
        childNode.isTextblock &&
        childNode.textContent.trim().length > 0
      ) {
        hasContent = true
      }
    }
  })
  return hasContent
}

const validateSectionsOrder = (
  requiredSections: RequiredSections,
  sectionsWithCategory: Sections
): SectionOrderValidationResult => {
  const requiredOrder = sortSections(requiredSections).map(
    (el) => el.sectionCategory
  )
  let passed = true
  const currentOrder = []
  for (const [category, sections] of sectionsWithCategory) {
    if (!requiredOrder.includes(category)) {
      // skip optional sections
      continue
    }
    const categoryPriorities = sections.map((el) => el.section.priority)
    if (!isSequential(categoryPriorities)) {
      // if the same category dose not come one after another in priority that means the order is not correct
      passed = false
      break
    }
    currentOrder.push(category)
  }
  if (passed) {
    passed = hasRightOrder(requiredOrder, currentOrder)
  }
  return {
    type: 'section-order',
    severity: 0,
    passed,
    data: { order: requiredOrder },
  }
}

const hasRightOrder = (
  requiredOrder: Array<string>,
  currentOrder: Array<string>
): boolean => {
  if (requiredOrder.length !== currentOrder.length) {
    return false
  }
  for (let i = 0; i < requiredOrder.length; i++) {
    if (requiredOrder[i].trim() !== currentOrder[i].trim()) {
      return false
    }
  }
  return true
}
const isSequential = (arr: Array<number>): boolean => {
  const sortedNumbers = arr.sort()
  if (arr.length <= 1) {
    return true
  }
  let previous = sortedNumbers[0] - 1
  for (const current of sortedNumbers) {
    if (current - previous !== 1) {
      return false
    }
    previous = current
  }
  return true
}
const sortSections = (requiredSections: RequiredSections) => {
  return requiredSections
    .map((el) => el.sectionDescription)
    .sort((sectionOne, sectionTwo) => {
      const p1 = sectionOne.priority || 0
      const p2 = sectionTwo.priority || 0
      return p1 - p2
    })
}

async function* validateRequiredSections(
  requiredSections: RequiredSections,
  sectionCategories: Set<string>
): AsyncGenerator<RequiredSectionValidationResult> {
  for (const requiredSection of requiredSections) {
    const { sectionDescription, severity } = requiredSection

    yield {
      type: 'required-section',
      passed: sectionCategories.has(sectionDescription.sectionCategory),
      severity,
      data: { sectionDescription }, // Todo pass the data only when fix needed
    }
  }
}
async function* validateSectionsTitle(
  requiredSections: Array<SectionTitleRequirement>,
  sectionCategories: Sections
): AsyncGenerator<SectionTitleValidationResult> {
  for (const requirement of requiredSections) {
    const { category } = requirement
    const sections = sectionCategories.get(category)
    if (sections) {
      for (const { section } of sections) {
        yield await validateTitleContent(requirement, section)

        const expectedTitleValidationResult = validateExpectedTitle(
          requirement,
          section
        )
        if (expectedTitleValidationResult) {
          yield expectedTitleValidationResult
        }
      }
    }
  }
}
const validateTitleContent = async (
  requirement: SectionTitleRequirement,
  section: Section
): Promise<SectionTitleValidationResult> => {
  const { title, _id } = section
  const passed = !!(title && title.trim().length > 0)
  return {
    type: 'section-title-contains-content',
    passed,
    severity: requirement.severity,
    data: { id: _id },
  }
}

const validateExpectedTitle = (
  requirement: SectionTitleRequirement,
  section: Section
): SectionTitleValidationResult | undefined => {
  const { title: sectionTitle, _id } = section
  const { title: requiredTitle, severity } = requirement
  if (requiredTitle) {
    return {
      type: 'section-title-match',
      passed: sectionTitle === requiredTitle,
      severity,
      data: { id: _id, title: requiredTitle },
    }
  }
}
const validateCount = (
  type: CountValidationType,
  count: number,
  checkMax: boolean,
  requirement?: CountRequirement,
  sectionName?: string
): CountValidationResult | undefined => {
  if (requirement && requirement.count !== undefined) {
    const requirementCount = requirement.count

    return {
      type,
      passed: checkMax ? count <= requirementCount : count >= requirementCount,
      severity: requirement.severity,
      data: { count, value: requirementCount },
      section: sectionName,
    }
  }
}

const validateFigureFormat = (
  type: FigureValidationType,
  format: FigureFormat | undefined,
  id: string,
  contentType: string,
  allowedFormats: Array<FigureFormat>
): FigureFormatValidationResult | undefined => {
  return {
    type,
    passed: (format && allowedFormats.includes(format)) || false,
    data: { id, contentType },
    severity: 0,
  }
}

const validateManuscriptCounts = async function* (
  article: ManuscriptNode,
  requirements: CountRequirements
): AsyncGenerator<CountValidationResult | undefined> {
  const manuscriptText = buildText(article)

  const manuscriptCounts: Counts = {
    characters: await countCharacters(manuscriptText),
    words: await countWords(manuscriptText),
  }

  yield validateCount(
    'manuscript-maximum-characters',
    manuscriptCounts.characters,
    true,
    requirements.characters.max
  )

  yield validateCount(
    'manuscript-minimum-characters',
    manuscriptCounts.characters,
    false,
    requirements.characters.min
  )

  yield validateCount(
    'manuscript-maximum-words',
    manuscriptCounts.words,
    true,
    requirements.words.max
  )

  yield validateCount(
    'manuscript-minimum-words',
    manuscriptCounts.words,
    false,
    requirements.words.min
  )
}

const validateSectionCounts = async function* (
  sectionsWithCategory: Sections,
  sectionCountRequirements: SectionCountRequirements
) {
  for (const [category, requirements] of Object.entries(
    sectionCountRequirements
  )) {
    const records = sectionsWithCategory.get(category)

    if (records) {
      for (const item of records) {
        yield validateCount(
          'section-maximum-characters',
          item.counts.characters,
          true,
          requirements.characters.max,
          category
        )

        yield validateCount(
          'section-minimum-characters',
          item.counts.characters,
          false,
          requirements.characters.min,
          category
        )

        yield validateCount(
          'section-maximum-words',
          item.counts.words,
          true,
          requirements.words.max,
          category
        )

        yield validateCount(
          'section-minimum-words',
          item.counts.words,
          false,
          requirements.words.min,
          category
        )
      }
    }
  }
}

const validateTitleCounts = async function* (
  manuscriptTitle: string,
  requirements: CountRequirements
) {
  const titleCounts: Counts = {
    words: await countWords(manuscriptTitle),
    characters: await countCharacters(manuscriptTitle),
  }

  yield validateCount(
    'manuscript-title-maximum-words',
    titleCounts.words,
    true,
    requirements.words.max
  )

  yield validateCount(
    'manuscript-title-minimum-words',
    titleCounts.words,
    false,
    requirements.words.min
  )

  yield validateCount(
    'manuscript-title-maximum-characters',
    titleCounts.characters,
    true,
    requirements.characters.max
  )

  yield validateCount(
    'manuscript-title-minimum-characters',
    titleCounts.characters,
    false,
    requirements.characters.min
  )
}

const validateFigureCounts = async function* (
  modelMap: Map<string, ContainedModel>,
  requirements: FigureCountRequirements
) {
  const figuresCount = countModelsByType(modelMap, ObjectTypes.Figure)

  yield validateCount(
    'manuscript-maximum-figures',
    figuresCount,
    true,
    requirements.figures.max
  )
}

const validateTableCounts = async function* (
  modelMap: Map<string, ContainedModel>,
  requirements: TableCountRequirements
) {
  const tablesCount = countModelsByType(modelMap, ObjectTypes.Table)

  yield validateCount(
    'manuscript-maximum-tables',
    tablesCount,
    true,
    requirements.tables.max
  )
}

const validateCombinedTableFigureCounts = async function* (
  modelMap: Map<string, ContainedModel>,
  requirements: CombinedFigureTableCountRequirements
) {
  const totalCount =
    countModelsByType(modelMap, ObjectTypes.Table) +
    countModelsByType(modelMap, ObjectTypes.Figure)

  yield validateCount(
    'manuscript-maximum-combined-figure-tables',
    totalCount,
    true,
    requirements.combinedFigureTable.max
  )
}

const validateReferenceCounts = async function* (
  referencesCount: number,
  requirements: ReferenceCountRequirements
) {
  yield validateCount(
    'manuscript-maximum-references',
    referencesCount,
    true,
    requirements.references.max
  )
}

const validateBibliography = async function* (
  modelMap: Map<string, ContainedModel>,
  references: Array<string>
): AsyncGenerator<BibliographyValidationResult> {
  for (const reference of references) {
    const model = modelMap.get(reference)
    if (model) {
      const bibliographyItem = model as BibliographyItem
      const results = validateDOI(bibliographyItem)
      for (const result of results) {
        yield result
      }
    } else {
      throw new Error(`${reference} not found in manuscript data`)
    }
  }
}

const validateDOI = function (
  bibliographyItem: BibliographyItem
): Array<BibliographyValidationResult> {
  const result: Array<BibliographyValidationResult> = []
  const { DOI } = bibliographyItem
  if (DOI) {
    result.push({
      type: 'bibliography-doi-format',
      passed: isValidDOI(DOI),
      data: { id: bibliographyItem._id },
      severity: 0,
    })
  }
  result.push({
    type: 'bibliography-doi-exist',
    passed: !!DOI,
    data: { id: bibliographyItem._id },
    severity: 0,
  })
  return result
}
const validateFigureFormats = (
  modelMap: Map<string, ContainedModel>,
  allowedFormats: Array<FigureFormat>
): Array<FigureFormatValidationResult> => {
  const figures = getModelsByType<Figure>(modelMap, ObjectTypes.Figure)
  const results: FigureFormatValidationResult[] = []
  figures.forEach((figure) => {
    if (figure.contentType) {
      const figFormat = getFigureFormat(figure.contentType)
      const validationResult = validateFigureFormat(
        'figure-format-validation',
        figFormat,
        figure._id,
        figure.contentType,
        allowedFormats
      )
      if (validationResult) {
        results.push(validationResult)
      }
    }
  })
  return results
}

export const runManuscriptValidator = async (
  manuscriptsData: ContainedModel[],
  template: ManuscriptTemplate,
  manuscriptId: string
): Promise<ValidationResult[]> => {
  const results: ValidationResult[] = []

  const id = getManuscriptId(manuscriptsData)
  if (id !== manuscriptId) {
    throw new BadRequestError(
      'manuscriptID does not match the one available in the Manuscript project.'
    )
  }
  const { article, modelMap } = createArticle(manuscriptsData, manuscriptId)
  const manuscriptsTitle: string = getManuscriptTitle(modelMap, manuscriptId)

  // TODO: find parent template (title === template.parent) and merge requirements?
  // TODO: the requirements in the parent seem to be duplicates…

  const sectionsWithCategory = await buildSections(article, modelMap)
  // validate required sections
  const requiredSections = buildRequiredSections(template)
  const sectionCategories = new Set(sectionsWithCategory.keys())

  for await (const result of validateRequiredSections(
    requiredSections,
    sectionCategories
  )) {
    results.push(result)
  }

  const hasMissingSections =
    results.filter((el) => el.type === 'required-section' && !el.passed)
      .length > 0
  if (!hasMissingSections) {
    const result = validateSectionsOrder(requiredSections, sectionsWithCategory)
    results.push(result)
  }

  // validate manuscript counts
  const manuscriptCountRequirements = buildManuscriptCountRequirements(template)

  for await (const result of validateManuscriptCounts(
    article,
    manuscriptCountRequirements
  )) {
    result && results.push(result)
  }
  const everySectionWithCategory = await buildSections(article, modelMap, true)

  // validate section counts
  const sectionCountRequirements = buildSectionCountRequirements(template)

  for await (const result of validateSectionCounts(
    sectionsWithCategory,
    sectionCountRequirements
  )) {
    result && results.push(result)
  }
  // Validate section title requirement
  const sectionTitleRequirement = buildSectionTitleRequirements(template)
  for await (const result of validateSectionsTitle(
    sectionTitleRequirement,
    sectionsWithCategory
  )) {
    result && results.push(result)
  }

  for await (const result of validateSectionBody(sectionsWithCategory)) {
    result && results.push(result)
  }
  for await (const result of validateSectionsCategory(
    everySectionWithCategory
  )) {
    result && results.push(result)
  }
  //validate title count requirements
  const titleCountRequirements: CountRequirements = buildTitleCountRequirements(
    template
  )
  for await (const result of validateTitleCounts(
    manuscriptsTitle,
    titleCountRequirements
  )) {
    result && results.push(result)
  }
  const manuscriptReferenceCountRequirement = buildManuscriptReferenceCountRequirements(
    template
  )
  const references = getReferences(modelMap)
  for await (const result of validateReferenceCounts(
    references.length,
    manuscriptReferenceCountRequirement
  )) {
    result && results.push(result)
  }
  for await (const result of validateBibliography(modelMap, references)) {
    result && results.push(result)
  }
  const figureCountRequirements: FigureCountRequirements = buildFigureCountRequirements(
    template
  )
  for await (const result of validateFigureCounts(
    modelMap,
    figureCountRequirements
  )) {
    result && results.push(result)
  }

  const tableCountRequirements: TableCountRequirements = buildTableCountRequirements(
    template
  )
  for await (const result of validateTableCounts(
    modelMap,
    tableCountRequirements
  )) {
    result && results.push(result)
  }

  const combinedFigureTableCountRequirements: CombinedFigureTableCountRequirements = buildCombinedFigureTableCountRequirements(
    template
  )
  for await (const result of validateCombinedTableFigureCounts(
    modelMap,
    combinedFigureTableCountRequirements
  )) {
    result && results.push(result)
  }

  const allowedFigureFormats = getAllowedFigureFormats(template)
  for (const result of validateFigureFormats(modelMap, allowedFigureFormats)) {
    result && results.push(result)
  }

  return results
}
