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

import axios from 'axios'

export type EdiFixOptions = {
  editorialStyle?: string
  processBookReferences?: boolean
  removeBadLineBreaks?: boolean
  pubMedLinking?: boolean
  crossrefLinking?: boolean
  customStyleSheet?: string
  timeOut?: number
}

export interface EdifixCredentials extends Record<string, string> {
  username: string
  password: string
}

const edifixClient = axios.create({
  baseURL: 'https://edifix.com/api',
})

export const convertBibliographyToJATS = async (
  credentials: EdifixCredentials,
  references: string[],
  options?: EdiFixOptions
): Promise<string> => {
  options = {
    editorialStyle: 'NULL',
    processBookReferences: true,
    removeBadLineBreaks: true,
    pubMedLinking: true,
    crossrefLinking: true,
    timeOut: 180,
    ...options,
  }
  const { username, password } = credentials
  const { data } = await edifixClient.post<string>('/v1/jobs.xml', {
    username,
    password,
    mtxt_input_refs: references.join('\n'),
    edit_style: options.editorialStyle,
    pubmed: options.pubMedLinking ? '1' : '0',
    crossref: options.crossrefLinking ? '1' : '0',
    b_book_processing: options.processBookReferences,
    b_remove_bad_line_breaks: options.removeBadLineBreaks,
    mtxt_stylesheet_contents: options.customStyleSheet,
    timeout_time: options.timeOut,
  })

  return data
}
