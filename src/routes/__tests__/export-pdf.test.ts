/*!
 * © 2022 Atypon Systems LLC
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
import { NextFunction, RequestHandler } from 'express'
import request from 'supertest'

import { config } from '../../lib/config'

jest.setTimeout(30000)

jest.mock(
  'express-jwt',
  () => (): RequestHandler => (req, res, next) => {
    req.user = { email: 'test@atypon.com' }
    next()
  }
)

describe('export PDF', () => {
  test('exports to a PDF file with Prince via HTML', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/export/pdf')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('engine', 'prince-html')
      .field('attachments', '[]')
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/pdf')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.pdf"'
    )
  })

  test('exports to a PDF file with Prince via HTML using a theme', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/export/pdf')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('engine', 'prince-html')
      .field('theme', 'plos-one')
      .field('attachments', '[]')
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/pdf')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.pdf"'
    )
  })

  test('Failure in auto-generation of PDF preview', async () => {
    const { app } = await import('../../app')
    const PDFHelpers = await import('../../lib/prince-html')
    const EmailAuthorization = await import('../../lib/email-authorization')

    const createHTMLMock = jest.spyOn(PDFHelpers, 'createPrincePDF')
    createHTMLMock.mockImplementation(() => {
      throw new Error()
    })

    const authenticationMock = jest.spyOn(
      EmailAuthorization,
      'emailAuthorization'
    )
    authenticationMock.mockImplementation(
      (req: never, res: never, next: NextFunction) => {
        return Promise.resolve(next())
      }
    )

    const response = await request(app)
      .post('/api/v2/export/pdf')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('engine', 'prince-html')
      .field('attachments', '[]')
      .set('pressroom-api-key', config.api_key)

    expect(response.status).toBe(500)
    expect(JSON.parse(response.body.error).internalErrorCode).toBe(
      'PREVIEW_PDF_GENERATION_FAILED'
    )
  })
})
