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
import { AnyValidationResult } from '@manuscripts/requirements'
import request from 'supertest'

import { config } from '../../lib/config'

describe('validate manuscript', () => {
  test('validates a manuscript with a test template', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/validate/manuscript')
      .set('Accept', 'application/json')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field(
        'templateID',
        'MPManuscriptTemplate:www-zotero-org-styles-nature-genetics-Nature-Genetics-Journal-Publication-Article'
      )
      .set('pressroom-api-key', config.api_key)
      .responseType('json')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/json; charset=utf-8')
    const results = JSON.parse(
      response.body.toString()
    ) as Array<AnyValidationResult>
    results.forEach((result) => {
      expect(result).toMatchSnapshot(
        {
          _id: expect.any(String),
        },
        'validate-manuscript'
      )
    })
  })
})
