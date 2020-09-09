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

import { parseXml } from 'libxmljs2'
import request from 'supertest'

import { config } from '../../lib/config'

jest.mock('../../lib/edifix')

describe('convert references via Edifix', () => {
  test('converts references from text to JATS XML', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/convert/references-edifix')
      .attach('file', __dirname + '/__fixtures__/references.txt')
      .field('editorialStyle', 'AMA')
      .set(
        'pressroom-edifix-secret',
        Buffer.from('test:test:test').toString('base64')
      )
      .set('pressroom-api-key', config.api_key)
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/xml')

    const xml = response.body.toString().trim()

    const doc = parseXml(xml, {
      dtdload: true,
      dtdvalid: true,
      nonet: true,
    })

    expect(doc.errors.length).toBe(0)
  })
})
