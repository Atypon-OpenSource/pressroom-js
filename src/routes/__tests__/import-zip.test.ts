import request from 'supertest'

import app from '../../app'

jest.mock('../../lib/jwt-authentication')
jest.mock('../../lib/pandoc')

describe('import ZIP', () => {
  test('imports from a Markdown file in a ZIP file', async () => {
    const response = await request(app)
      .post('/import/zip')
      .attach('file', __dirname + '/__fixtures__/markdown.zip')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.manuproj"'
    )
  })

  test('imports from a LaTeX file in a ZIP file', async () => {
    const response = await request(app)
      .post('/import/zip')
      .attach('file', __dirname + '/__fixtures__/latex.zip')

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.manuproj"'
    )
  })

  // TODO: imports from a JATS XML file in a ZIP file
})
