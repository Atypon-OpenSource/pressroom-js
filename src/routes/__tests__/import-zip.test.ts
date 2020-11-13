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

jest.setTimeout(30000)

describe('import ZIP', () => {
  test('imports from a Markdown file in a ZIP file', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/import/zip')
      .attach('file', __dirname + '/__fixtures__/markdown.zip')
      .set('pressroom-api-key', config.api_key)
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.manuproj"'
    )
  })

  test('imports from a LaTeX file in a ZIP file', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/import/zip')
      .attach('file', __dirname + '/__fixtures__/latex.zip')
      .set('pressroom-api-key', config.api_key)
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.manuproj"'
    )
  })

  test('imports from a JATS XML file in a ZIP file', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/import/zip')
      .attach('file', __dirname + '/__fixtures__/jats.zip')
      .set('pressroom-api-key', config.api_key)
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.manuproj"'
    )
  })

  // TODO: imports from a HTML file in a ZIP file
})
