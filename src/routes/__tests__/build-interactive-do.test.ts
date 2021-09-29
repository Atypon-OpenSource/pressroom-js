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
import JSZip from 'jszip'
import request from 'supertest'

import { config } from '../../lib/config'

describe('build interactive asset DO', () => {
  test('build interactive asset DO', async () => {
    const { app } = await import('../../app')

    const response = await request(app)
      .post('/api/v2/build/interactive-asset-do')
      .attach('file', __dirname + '/__fixtures__/html-asset.zip')
      .field('baseDoi', '10.1234/x567')
      .field('doi', '10.1234/567')
      .field('title', 'Test Interactive Asset')
      .field('embedWidth', 70)
      .field('embedHeight', 120)
      .set('pressroom-api-key', config.api_key)
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )

    const zip = await new JSZip().loadAsync(response.body)
    expect(Object.keys(zip.files).length).toBe(2)
    const expectedFiles = ['567/interactive.zip', '567/meta/567.xml']
    const zipFiles: Array<string> = []
    zip.forEach((path) => {
      zipFiles.push(path)
    })

    expect(zipFiles).toStrictEqual(expectedFiles)
  })
})
