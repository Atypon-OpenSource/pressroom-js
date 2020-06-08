import request from 'supertest'

import app from '../../app'

jest.mock('../../lib/jwt-authentication')
jest.mock('../../lib/store')
jest.mock('../../lib/pandoc')

describe('build picker bundle', () => {
  test('builds picker bundle', async () => {
    const response = await request(app).get(
      '/build/picker-bundle/MPProject:test/MPManuscript:test'
    )

    expect(response.status).toBe(200)
    expect(response.get('Content-Type')).toBe('application/zip')
    expect(response.get('Content-Disposition')).toBe(
      'attachment; filename="manuscript.zip"'
    )

    // expect(response.get('Content-Length')).toBe('12146')
  })
})
