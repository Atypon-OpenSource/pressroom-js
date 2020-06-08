import { buildManifest } from '../create-manifest'

describe('manifest builder', () => {
  test('builds basic manifest', () => {
    const manifest = buildManifest({
      groupDoi: '10.0000/test',
      submissionType: 'full',
    })

    expect(manifest).toMatchSnapshot()
  })

  test('builds manifest with processing instructions', () => {
    const manifest = buildManifest({
      groupDoi: '10.0000/test',
      submissionType: 'partial',
      processingInstructions: {
        priorityLevel: 'high',
        makeLiveCondition: 'no-errors',
      },
    })

    expect(manifest).toMatchSnapshot()
  })
})
