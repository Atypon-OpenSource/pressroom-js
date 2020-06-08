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

const manuscriptExtensionToPandocFormatMap = new Map<string, string>([
  ['.tex', 'latex'],
  ['.latex', 'latex'],
  ['.md', 'markdown'],
  ['.xml', 'jats'],
])

// find the main manuscript file (a file with .md, .tex, .xml etc extension)
export const findManuscriptFile = async (
  dir: string
): Promise<{ file: string; format: string }> => {
  const files = await fs.readdir(dir)

  for (const [
    extension,
    format,
  ] of manuscriptExtensionToPandocFormatMap.entries()) {
    for (const file of files) {
      if (path.extname(file) === extension) {
        return { file, format }
      }
    }
  }

  throw new Error('Manuscript file not found')
}
