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

describe('export bibliography', () => {
  test('exports CSL JSON as BibTeX', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/export/bibliography')
      .attach('file', __dirname + '/__fixtures__/csl.json')
      .field('format', 'bibtex')
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.type).toBe('text/plain')
    expect(response.body.toString()).toMatchSnapshot('export-bibtex')
  })

  test('exports CSL JSON as RIS', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/export/bibliography')
      .attach('file', __dirname + '/__fixtures__/csl.json')
      .field('format', 'ris')
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.type).toBe('text/plain')
    expect(response.body.toString()).toMatchSnapshot('export-ris')
  })

  test('exports CSL JSON as EndNote', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/export/bibliography')
      .attach('file', __dirname + '/__fixtures__/csl.json')
      .field('format', 'end')
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.type).toBe('text/plain')
    expect(response.body.toString()).toMatchSnapshot('export-endnote')
  })
})
