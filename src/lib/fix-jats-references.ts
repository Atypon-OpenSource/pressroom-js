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

export const fixImageReferences = async (
  imageDirPath: string,
  doc: Document
): Promise<void> => {
  const imageDirExist: boolean = await fs.pathExists(imageDirPath)
  const images = imageDirExist ? await fs.readdir(imageDirPath) : []

  for (const image of images) {
    const { name } = path.parse(image)

    await processElements(
      doc,
      `//*[@xlink:href="${name}"]`,
      async (element) => {
        element.setAttributeNS(XLINK_NAMESPACE, 'href', `images/${image}`)
      }
    )
  }
}
