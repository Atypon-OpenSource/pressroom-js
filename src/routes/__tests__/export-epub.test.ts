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
import request from 'supertest'

import { hasCommands } from '../../lib/has-commands'

jest.mock('../../lib/jwt-authentication')

describe('export EPUB', () => {
  test('exports to an EPUB file', async () => {
    if (!hasCommands) {
      jest.doMock('../../lib/pandoc')
    }

    const { app } = await import('../../app')

    const response = await request(app)
      .post('/export/epub')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/epub+zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.epub"'
    )

    // expect(response.get('Content-Length')).toBe('10132')
  })
})
