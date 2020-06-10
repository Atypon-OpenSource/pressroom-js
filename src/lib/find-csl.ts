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
import { Manuscript } from '@manuscripts/manuscripts-json-schema'
import { pathExists } from 'fs-extra'

export const findCSL = async (
  dir: string,
  manuscript: Manuscript
): Promise<string | undefined> => {
  if (manuscript.bundle) {
    const filename = manuscript.bundle.replace(':', '_')
    const path = dir + '/Data/' + filename

    if (await pathExists(path)) {
      return path
    }
  }
}
