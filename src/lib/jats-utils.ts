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

import compose from 'compose-function'

export const removeCodeListing = (jats: string): string => {
  const doc = new DOMParser().parseFromString(jats, 'application/xml')
  const codeListing = doc.querySelectorAll('fig[specific-use="source"]')
  codeListing.forEach((node) => {
    node.remove()
  })
  return new XMLSerializer().serializeToString(doc)
}

export const removeNonPrintableChars = (jats: string): string =>
  //eslint-disable-next-line no-control-regex
  jats.replace(/[\u0000-\u0008,\u000A-\u001F,\u007F-\u00A0]+/g, '')

export const filterJATSResult = compose(
  removeCodeListing,
  removeNonPrintableChars
)
