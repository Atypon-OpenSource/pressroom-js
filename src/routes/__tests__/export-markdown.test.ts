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
import JSZip from 'jszip'
import request from 'supertest'

import { config } from '../../lib/config'

describe('export Markdown', () => {
  test('exports to a ZIP file containing a Markdown file', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/export/markdown')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('attachments', JSON.stringify([]))
      .set('pressroom-api-key', config.api_key)
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )

    const zip = await new JSZip().loadAsync(response.body)

    expect(Object.keys(zip.files).length).toBe(2)

    const tex = await zip.files['manuscript.md'].async('text')

    expect(tex).toMatch('title: A Test Manuscript')
  })
})
