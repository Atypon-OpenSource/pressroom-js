/**
 * @jest-environment node
 */

import request from 'supertest'

import app from '../../app'

jest.mock('../../lib/jwt-authentication')
jest.mock('../../lib/extyles-arc')
jest.mock('../../lib/pandoc')
jest.setTimeout(10000)

describe('import Word via Arc', () => {
  test('imports from a Word file via Arc', async () => {
    const response = await request(app)
      .post('/import/word-arc')
      .attach('file', __dirname + '/__fixtures__/manuscript.docx')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.manuproj"'
    )
  })
})
