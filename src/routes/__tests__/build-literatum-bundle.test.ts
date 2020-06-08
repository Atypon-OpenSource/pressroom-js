import request from 'supertest'

import app from '../../app'

jest.mock('../../lib/jwt-authentication')
jest.mock('../../lib/extyles-arc')
jest.mock('../../lib/gaia')
jest.mock('../../lib/pandoc')
jest.setTimeout(30000) // allow time for PDF generation

describe('build literatum bundle', () => {
  test('builds JATS Literatum bundle from DOCX', async () => {
    const response = await request(app)
      .post('/build/literatum-bundle')
      .attach('file', __dirname + '/__fixtures__/manuscript.docx')
      .field('doi', '10.0000/test')
      .field('groupDoi', '10.0000/test-group')
      .field('xmlType', 'jats')
      .field('deposit', false) // TODO: true, mocked

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )
  })

  test('builds WileyML Literatum bundle from DOCX', async () => {
    const response = await request(app)
      .post('/build/literatum-bundle')
      .attach('file', __dirname + '/__fixtures__/manuscript.docx')
      .field('doi', '10.0000/test')
      .field('groupDoi', '10.0000/test-group')
      .field('xmlType', 'wileyml')
      .field('deposit', false) // TODO: true, mocked

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )
  })
})
