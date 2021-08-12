/*!
 * © 2021 Atypon Systems LLC
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
import { parseXml } from 'libxmljs2'
import request from 'supertest'

jest.mock('express-jwt', () => (): RequestHandler => (req, res, next) => {
  req.user = { email: 'test@atypon.com' }
  next()
})

describe('export literatum JATS', () => {
  test('exports to a ZIP file containing a JATS XML', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/export/literatum-jats')
      .attach('file', __dirname + '/__fixtures__/external-files.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('doi', '10.1234/567')
      .field('frontMatterOnly', false)
      .field(
        'supplementaryMaterialDOIs',
        JSON.stringify([
          {
            url:
              'https://siam-x5432.ciplit.com/action/leanworkflowDownloadAttachment?id=6db76bde-4cde-4579-b012-24dead961adb&name=html-asset.zip',
            doi: '10.1000/xyz123',
          },
        ])
      )
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/xml; charset=utf-8')

    const xml = response.body.toString()
    const doc = parseXml(xml, {
      dtdload: true,
      dtdvalid: true,
      nonet: true,
    })

    expect(doc.errors.length).toBe(0)

    expect(doc.getDtd()).toEqual({
      externalId:
        '-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD with OASIS Tables with MathML3 v1.2 20190208//EN',
      name: 'article',
      systemId:
        'http://jats.nlm.nih.gov/archiving/1.2/JATS-archive-oasis-article1-mathml3.dtd',
    })
    expect(xml).toMatchSnapshot()
  })
})
