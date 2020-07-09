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

jest.mock('../../lib/jwt-authentication')
jest.setTimeout(30000)

describe('export PDF', () => {
  test('exports to a PDF file with xelatex (default)', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/export/pdf')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/pdf')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.pdf"'
    )
  })

  test('exports to a PDF file with Prince ', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/export/pdf')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('engine', 'prince')
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/pdf')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.pdf"'
    )
  })

  test('exports to a PDF file with WeasyPrint', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/export/pdf')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('engine', 'weasyprint')
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/pdf')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.pdf"'
    )
  })

  test('exports to a PDF file with Tectonic', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/export/pdf')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('engine', 'tectonic')
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/pdf')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.pdf"'
    )
  })
})
