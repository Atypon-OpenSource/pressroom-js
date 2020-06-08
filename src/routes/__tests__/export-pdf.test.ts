import request from 'supertest'

import app from '../../app'

jest.mock('../../lib/jwt-authentication')
jest.mock('../../lib/pandoc')

describe('export PDF', () => {
  test('exports to a PDF file', async () => {
    const response = await request(app)
      .post('/export/pdf')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/pdf')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.pdf"'
    )
  })
})
