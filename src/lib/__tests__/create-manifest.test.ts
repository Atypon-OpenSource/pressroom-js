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
import { buildManifest } from '../create-manifest'

describe('manifest builder', () => {
  test('builds basic manifest', () => {
    const manifest = buildManifest({
      groupDoi: '10.0000/test',
      submissionType: 'full',
    })

    expect(manifest).toMatchSnapshot()
  })

  test('builds manifest with processing instructions', () => {
    const manifest = buildManifest({
      groupDoi: '10.0000/test',
      submissionType: 'partial',
      processingInstructions: {
        priorityLevel: 'high',
        makeLiveCondition: 'no-errors',
      },
    })

    expect(manifest).toMatchSnapshot()
  })
})
