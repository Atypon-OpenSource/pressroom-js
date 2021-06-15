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
import JSZip from 'jszip'
import { parseXml } from 'libxmljs2'
import request from 'supertest'

import { app } from '../../app'

jest.mock('express-jwt', () => (): RequestHandler => (req, res, next) => {
  req.user = { email: 'test@atypon.com' }
  next()
})

describe('export Literatum Bundle', () => {
  test('exports to Literatum Bundle', async () => {
    const response = await request(app)
      .post('/api/v2/export/literatum-bundle')
      .attach('file', __dirname + '/__fixtures__/external-files.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('deposit', false)
      .field('doi', '10.1234/567')
      .field('groupDOI', '10.0000/test')
      .field('seriesCode', '10.0000/test')
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
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )

    const zip = await new JSZip().loadAsync(response.body)

    const expectedFiles = [
      'test/567/graphic/figure 2.jpg',
      'test/567/external/hon-20-0144-r1.docx',
      'test/567/external/hon-20-0144.pdf',
      'test/567/external/html-asset.zip',
      'test/567/567.xml',
      'test/567/567.pdf',
      'manifest.xml',
    ]
    const zipFiles: Array<string> = []
    zip.forEach((path) => {
      zipFiles.push(path)
    })

    expect(zipFiles).toStrictEqual(expectedFiles)
    const xml = await zip.files['test/567/567.xml'].async('text')

    const doc = parseXml(xml, {
      dtdload: true,
      dtdvalid: true,
      nonet: true,
    })
    expect(doc.errors.length).toBe(0)

    expect(xml).toMatchSnapshot()
  })
})
