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

jest.mock('../../lib/jwt-authentication')

describe('export ICML', () => {
  test('exports to a ZIP file containing an ICML file', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/export/icml')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )

    const zip = await new JSZip().loadAsync(response.body)

    expect(Object.keys(zip.files).length).toBe(1)

    const xml = await zip.files['manuscript.icml'].async('text')
    const doc = new DOMParser().parseFromString(xml, 'application/xml')

    const text = doc.evaluate(
      'string(//Content)',
      doc,
      doc.createNSResolver(doc),
      XPathResult.STRING_TYPE
    )
    expect(text.stringValue).toBe('A paragraph')
  })
})
