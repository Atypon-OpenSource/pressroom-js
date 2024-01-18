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
import { NextFunction, Request, Response } from 'express'
import JSZip from 'jszip'
import { parseXml } from 'libxmljs2'
import request from 'supertest'

import { app } from '../../app'
import { csl, locale } from './__fixtures__/csl'

jest.mock('express-jwt', () => ({
  expressjwt: () => (req: Request, res: Response, next: NextFunction) => {
    req.auth = { email: 'test@atypon.com' }
    next()
  },
}))

const route = '/api/v2/export/bundle/literatum'

describe('export Literatum Bundle', () => {
  test('exports to Literatum Bundle', async () => {
    const response = await request(app)
      .post(route)
      .attach('file', __dirname + '/__fixtures__/attachment-ids.zip')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('doi', '10.1234/567')
      .field('groupDOI', '10.0000/test')
      .field('frontMatterOnly', false)
      .field('citationStyle', csl)
      .field('locale', locale)
      .field(
        'supplementaryMaterialDOIs',
        JSON.stringify([
          {
            url: 'attachment:db76bde-4cde-4579-b012-24dead961adc',
            doi: '10.1000/xyz123',
          },
        ])
      )
      .field(
        'attachments',
        JSON.stringify([
          {
            url: 'attachment:db76bde-4cde-4579-b012-24dead961add',
            name: 'figure 2.jpg',
            MIME: 'image/jpeg',
            designation: 'figure',
          },
          {
            url: 'attachment:db76bde-4cde-4579-b012-24dead961ada',
            name: 'hon-20-0144.pdf',
            MIME: 'application/pdf',
            designation: 'submission-pdf',
          },
          {
            url: 'attachment:db76bde-4cde-4579-b012-24dead961adc',
            name: 'html-asset.zip',
            MIME: 'application/pdf',
            designation: 'interactive-html',
          },
          {
            url: 'attachment:db76bde-4cde-4579-b012-24dead961adb',
            name: 'hon-20-0144-r1.docx',
            MIME: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            designation: 'document',
          },
          {
            url: 'attachment:1e2364ea-3c36-4801-b523-70c660fcc2a4',
            name: 'supporting information.pdf',
            MIME: 'application/pdf',
            designation: 'supplementary',
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

  test('exports to Literatum Bundle with theme', async () => {
    const response = await request(app)
      .post(route)
      .attach('file', __dirname + '/__fixtures__/attachment-ids.zip')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('doi', '10.1234/567')
      .field('groupDOI', '10.0000/test')
      .field('frontMatterOnly', false)
      .field('theme', 'plos-one')
      .field('citationStyle', csl)
      .field('locale', locale)
      .field(
        'supplementaryMaterialDOIs',
        JSON.stringify([
          {
            url: 'attachment:db76bde-4cde-4579-b012-24dead961adc',
            doi: '10.1000/xyz123',
          },
        ])
      )
      .field(
        'attachments',
        JSON.stringify([
          {
            url: 'attachment:db76bde-4cde-4579-b012-24dead961add',
            name: 'figure 2.jpg',
            MIME: 'image/jpeg',
            designation: 'figure',
          },
          {
            url: 'attachment:db76bde-4cde-4579-b012-24dead961ada',
            name: 'hon-20-0144.pdf',
            MIME: 'application/pdf',
            designation: 'submission-pdf',
          },
          {
            url: 'attachment:db76bde-4cde-4579-b012-24dead961adc',
            name: 'html-asset.zip',
            MIME: 'application/pdf',
            designation: 'interactive-html',
          },
          {
            url: 'attachment:db76bde-4cde-4579-b012-24dead961adb',
            name: 'hon-20-0144-r1.docx',
            MIME: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            designation: 'document',
          },
          {
            url: 'attachment:1e2364ea-3c36-4801-b523-70c660fcc2a4',
            name: 'supporting information.pdf',
            MIME: 'application/pdf',
            designation: 'supplementary',
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
  })
})
