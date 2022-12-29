/*!
 * © 2021 Atypon Systems LLC
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
  MissingElement,
} from '@manuscripts/manuscript-transform'
import fs from 'fs-extra'

import { createArticle } from '../create-article'
import { buildModelMap } from '../models'

const mockInputFile =
  __dirname + '/../__mocks__/__fixtures__/index.manuscript-json'
describe('create article', () => {
  test('disallow missing elements', () => {
    const { data }: { data: Array<ContainedModel> } =
      fs.readJSONSync(mockInputFile)
    const modelMap = buildModelMap(data)
    modelMap.delete('MPParagraphElement:69BEE95C-ADA9-4CBB-8E4C-6E3E9D1DDADA')
    expect(() =>
      createArticle(
        [...modelMap.values()],
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
    ).toThrow(MissingElement)
  })
})
