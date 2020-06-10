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
import fs from 'fs-extra'
import path from 'path'

import { processElements, XLINK_NAMESPACE } from './data'

export const fixExportedData = (doc: Document, dir: string): Promise<void> =>
  processElements(doc, `//*[@xlink:href]`, async (element) => {
    const href = element.getAttributeNS(XLINK_NAMESPACE, 'href')

    if (href) {
      // TODO: exclude non-relative paths?
      const { name } = path.parse(href)

      if (await fs.pathExists(dir + '/Data/' + name)) {
        element.setAttributeNS(XLINK_NAMESPACE, 'href', 'Data/' + name)
      }
    }
  })
