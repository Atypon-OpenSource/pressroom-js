import request from 'supertest'

import app from '../../app'

jest.mock('../../lib/jwt-authentication')
jest.mock('../../lib/pandoc')

describe('import Word', () => {
  test('imports from a Word file', async () => {
    const response = await request(app)
      .post('/import/word')
      .attach('file', __dirname + '/__fixtures__/manuscript.docx')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.manuproj"'
    )
  })
})
