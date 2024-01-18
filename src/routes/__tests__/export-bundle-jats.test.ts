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
import { parseXml } from 'libxmljs2'
import request from 'supertest'

import { config } from '../../lib/config'
import { csl, locale } from './__fixtures__/csl'

jest.setTimeout(60000)
const route = '/api/v2/export/bundle/jats'

describe('export JATS', () => {
  test('exports to a ZIP file containing a JATS XML with external file metadata', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post(route)
      .attach('file', __dirname + '/__fixtures__/attachment-ids.zip')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('citationStyle', csl)
      .field('locale', locale)
      .field(
        'attachments',
        JSON.stringify([
          {
            url: 'attachment:db76bde-4cde-4579-b012-24dead961add',
            name: 'figure 2.jpg',
          },
        ])
      )
      .set('pressroom-api-key', config.api_key)
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )

    const zip = await new JSZip().loadAsync(response.body)

    expect(Object.keys(zip.files).length).toBe(2)

    const xml = await zip.files['manuscript.xml'].async('text')

    const doc = parseXml(xml, {
      dtdload: true,
      dtdvalid: true,
      nonet: true,
    })

    const expectedFiles = ['graphic/figure 2.jpg', 'manuscript.xml']
    const zipFiles: Array<string> = []
    zip.forEach((path) => {
      zipFiles.push(path)
    })

    expect(zipFiles).toStrictEqual(expectedFiles)

    expect(doc.errors.length).toBe(0)

    expect(doc.getDtd()).toEqual({
      externalId:
        '-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD with OASIS Tables with MathML3 v1.2 20190208//EN',
      name: 'article',
      systemId:
        'http://jats.nlm.nih.gov/archiving/1.2/JATS-archive-oasis-article1-mathml3.dtd',
    })
  })

  test('exports to a ZIP file containing a JATS XML file', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post(route)
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('citationStyle', csl)
      .field('locale', locale)
      .field('attachments', JSON.stringify([]))
      .set('pressroom-api-key', config.api_key)
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )

    const zip = await new JSZip().loadAsync(response.body)

    expect(Object.keys(zip.files).length).toBe(2)

    const xml = await zip.files['manuscript.xml'].async('text')

    const doc = parseXml(xml, {
      dtdload: true,
      dtdvalid: true,
      nonet: true,
    })
    const expectedFiles = ['Data/fig-2.png', 'manuscript.xml']
    const zipFiles: Array<string> = []
    zip.forEach((path) => {
      zipFiles.push(path)
    })

    expect(zipFiles).toStrictEqual(expectedFiles)
    expect(doc.errors.length).toBe(0)

    expect(doc.getDtd()).toEqual({
      externalId:
        '-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD with OASIS Tables with MathML3 v1.2 20190208//EN',
      name: 'article',
      systemId:
        'http://jats.nlm.nih.gov/archiving/1.2/JATS-archive-oasis-article1-mathml3.dtd',
    })
  })

  test('exports to a ZIP file containing a JATS v1.1 XML file', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post(route)
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('version', '1.1')
      .field('citationStyle', csl)
      .field('locale', locale)
      .field('attachments', JSON.stringify([]))
      .set('pressroom-api-key', config.api_key)
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )

    const zip = await new JSZip().loadAsync(response.body)

    expect(Object.keys(zip.files).length).toBe(2)

    const xml = await zip.files['manuscript.xml'].async('text')

    const doc = parseXml(xml, {
      dtdload: true,
      dtdvalid: true,
      nonet: true,
    })

    expect(doc.errors.length).toBe(0)

    expect(doc.getDtd()).toEqual({
      externalId:
        '-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD with OASIS Tables with MathML3 v1.1 20151215//EN',
      name: 'article',
      systemId:
        'http://jats.nlm.nih.gov/archiving/1.1/JATS-archive-oasis-article1-mathml3.dtd',
    })
  })

  test('automatically chooses a manuscript ID', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post(route)
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field('manuscriptID', 'auto')
      .field('citationStyle', csl)
      .field('locale', locale)
      .field('attachments', JSON.stringify([]))
      .set('pressroom-api-key', config.api_key)
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )

    const zip = await new JSZip().loadAsync(response.body)

    expect(Object.keys(zip.files).length).toBe(2)

    const xml = await zip.files['manuscript.xml'].async('text')

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
  })
})
