import request from 'supertest'

import app from '../../app'

jest.mock('../../lib/jwt-authentication')
jest.mock('../../lib/pandoc')

describe('export EPUB', () => {
  test('exports to an EPUB file', async () => {
    const response = await request(app)
      .post('/export/epub')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/epub+zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.epub"'
    )

    // expect(response.get('Content-Length')).toBe('10132')
  })
})
