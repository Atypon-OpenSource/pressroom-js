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

jest.mock('../../lib/grobid')

describe('import PDF', () => {
  test('imports from a PDF file via GROBID', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/import/pdf')
      .attach('file', __dirname + '/__fixtures__/manuscript.pdf')
      .set('pressroom-api-key', config.api_key)
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.manuproj"'
    )

    const zip = await new JSZip().loadAsync(response.body)
    const json = await zip.files['index.manuscript-json'].async('text')
    const { data } = JSON.parse(json)

    const deidentifiedModels = JSON.parse(
      JSON.stringify(data, (key, value) => (key === '_id' ? undefined : value))
    )

    expect(deidentifiedModels).toMatchSnapshot()
  })
})
