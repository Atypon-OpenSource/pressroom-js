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

import { config } from '../../lib/config'

jest.mock('../../lib/extyles-arc')
jest.mock('../../lib/fetch-literatum-attachment')
jest.mock('../../lib/gaia')
jest.setTimeout(30000) // allow time for PDF generation

describe('build submission bundle', () => {
  test('fetches and builds submission bundle', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/submission')
      .send({
        depositoryCode: 'S1',
        attachments: [
          {
            designation: 'Main Document',
            format: 'docx',
            name: 'Manuscript.docx',
            url: 'https://example.com/manuscript.docx',
          },
        ],
        metadata: {
          digitalISSN: '1234-5678',
          doi: '10.0000/1234',
        },
      })
      .set('pressroom-api-key', config.api_key)
      .set('Content-Type', 'application/json')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )
  })
})
