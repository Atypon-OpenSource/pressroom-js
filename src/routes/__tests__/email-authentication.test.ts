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
import { RequestHandler } from 'express'
import request from 'supertest'

import { app } from '../../app'

jest.mock(
  'express-jwt',
  () => (): RequestHandler => (req, res, next) => {
    req.user = { email: 'test@foo.com' }
    next()
  }
)

describe('email authentication', () => {
  test('limits endpoint access by email domain', async () => {
    const response = await request(app)
      .post('/api/v2/export/literatum-bundle')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('deposit', false)
      .field('doi', '10.1234/567')
      .field('groupDOI', '10.0000/test')
      .field('seriesCode', '10.0000/test')
      .field('frontMatterOnly', false)
      .responseType('blob')

    expect(response.status).toBe(401)
  })
})
