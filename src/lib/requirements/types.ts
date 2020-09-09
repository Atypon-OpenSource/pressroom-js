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
import { SectionNode } from '@manuscripts/manuscript-transform'
import {
  Model,
  ObjectTypes,
  Section,
  SectionDescription,
} from '@manuscripts/manuscripts-json-schema'

export type TemplateRequirements = Partial<Record<ObjectTypes, Model[]>>

export type CountValidationType =
  | 'manuscript-maximum-characters'
  | 'manuscript-minimum-characters'
  | 'manuscript-maximum-words'
  | 'manuscript-minimum-words'
  | 'section-maximum-characters'
  | 'section-minimum-characters'
  | 'section-maximum-words'
  | 'section-minimum-words'
  | 'manuscript-title-maximum-characters'
  | 'manuscript-title-minimum-characters'
  | 'manuscript-title-maximum-words'
  | 'manuscript-title-minimum-words'
  | 'manuscript-maximum-figures'
  | 'manuscript-maximum-tables'
  | 'manuscript-maximum-combined-figure-tables'
  | 'manuscript-maximum-references'

export type FigureValidationType = 'figure-format-validation'

export interface RequiredSectionValidationResult extends BaseValidationResult {
  type: 'required-section'
  data: { sectionDescription: SectionDescription }
}

export interface SectionTitleValidationResult extends BaseValidationResult {
  type: 'section-title-match' | 'section-title-contains-content'
  data: { id: string; title?: string }
}

export interface SectionOrderValidationResult extends BaseValidationResult {
  type: 'section-order'
  data: { order: Array<string> }
}

export interface SectionBodyValidationResult extends BaseValidationResult {
  type: 'section-body-has-content'
  data: { id: string }
}

export interface SectionCategoryValidation extends BaseValidationResult {
  type: 'section-category-uniqueness'
  data: { id: string }
}
export interface CountValidationResult extends BaseValidationResult {
  type: CountValidationType
  data: { count: number; value: number }
  section?: string
  // TODO: fixer function?
}

export interface FigureFormatValidationResult extends BaseValidationResult {
  type: FigureValidationType
  data: { id: string; contentType: string }
}

export interface BibliographyValidationResult extends BaseValidationResult {
  type: 'bibliography-doi-format' | 'bibliography-doi-exist'
  data: { id: string }
}

export type BaseValidationResult = {
  type: string
  passed: boolean
  severity: number
}
export type ValidationResult =
  | RequiredSectionValidationResult
  | CountValidationResult
  | FigureFormatValidationResult
  | SectionTitleValidationResult
  | SectionOrderValidationResult
  | SectionBodyValidationResult
  | SectionCategoryValidation
  | BibliographyValidationResult

export type RequiredSections = Array<{
  sectionDescription: SectionDescription
  severity: number
}>

export type CountRequirement = { count: number; severity: number }

export type CountRequirements = {
  characters: {
    max?: CountRequirement
    min?: CountRequirement
  }
  words: {
    max?: CountRequirement
    min?: CountRequirement
  }
  title?: {
    max?: CountRequirement
    min?: CountRequirement
  }
}

export type FigureCountRequirements = {
  figures: {
    max?: CountRequirement
  }
}

export type CombinedFigureTableCountRequirements = {
  combinedFigureTable: {
    max?: CountRequirement
  }
}

export type TableCountRequirements = {
  tables: {
    max?: CountRequirement
  }
}

export type SectionCountRequirements = Record<string, CountRequirements>

export type SectionTitleRequirement = {
  title: string
  severity: number
  category: string
}

export type SectionWithTitle = {
  title: string
  id: string
}
export interface CountRequirementModel extends Model {
  count?: number
  ignored?: boolean
  severity: number
}

export type SectionDescriptionCountProperty =
  | 'maxWordCount'
  | 'minWordCount'
  | 'maxKeywordCount'
  | 'minKeywordCount'
  | 'maxCharCount'
  | 'minCharCount'

export interface Counts {
  words: number
  characters: number
}

export type ReferenceCountRequirements = {
  references: {
    max?: CountRequirement
  }
}

export type Sections = Map<
  string,
  Array<{ node: SectionNode; counts: Counts; section: Section }>
>
