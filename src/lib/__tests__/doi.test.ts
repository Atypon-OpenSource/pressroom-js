/*!
 * © 2019 Atypon Systems LLC
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

import { isValidDOI } from '../doi'

describe('doi', () => {
  test('detects invalid DOI', () => {
    expect(isValidDOI('123')).toBe(false)
  })

  test('detects valid DOI', () => {
    expect(isValidDOI('10.5555/123')).toBe(true)
  })
})
