import request from 'supertest'

import app from '../../app'

jest.mock('../../lib/jwt-authentication')
jest.mock('../../lib/extyles-arc')
jest.mock('../../lib/gaia')
jest.mock('../../lib/pandoc')
jest.setTimeout(10000000) // allow time for PDF generation

describe('build gateway bundle', () => {
  test('builds gateway bundle from DOCX', async () => {
    const response = await request(app)
      .post('/build/gateway-bundle')
      .attach('file', __dirname + '/__fixtures__/manuscript.docx')
      .field('doi', '10.0000/test')
      .field('issn', '1234-5678')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )
  })
})
