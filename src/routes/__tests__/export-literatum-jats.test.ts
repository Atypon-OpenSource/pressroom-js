import request from 'supertest'

import app from '../../app'

jest.mock('../../lib/jwt-authentication')
jest.mock('../../lib/pandoc')

describe('export Literatum JATS', () => {
  test('exports to Literatum JATS', async () => {
    const response = await request(app)
      .post('/export/literatum-jats')
      .attach('file', __dirname + '/__fixtures__/manuscript.manuproj')
      .field(
        'manuscriptID',
        'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
      )
      .field('deposit', false)
      .field('doi', '10.1234/567')
      .field('frontMatterOnly', false)

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )
  })
})
