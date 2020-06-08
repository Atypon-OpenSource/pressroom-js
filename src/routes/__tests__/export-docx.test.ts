import request from 'supertest'

import app from '../../app'

jest.mock('../../lib/jwt-authentication')
jest.mock('../../lib/pandoc')

describe('export DOCX', () => {
  test('exports to a DOCX file', async () => {
    const response = await request(app)
      .post('/export/docx')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.docx"'
    )

    // expect(response.get('Content-Length')).toBe('12146')
  })
})
