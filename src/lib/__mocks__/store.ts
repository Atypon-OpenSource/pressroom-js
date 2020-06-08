import { Model } from '@manuscripts/manuscripts-json-schema'
import fs from 'fs-extra'

import { Row } from '../store'

const mockData = fs.readJSONSync(
  __dirname + '/__fixtures__/index.manuscript-json'
)

export const getContainedResources = async (): Promise<{ rows: Row[] }> => ({
  rows: mockData.data.map((model: Model) => ({
    id: model._id,
    projects: {
      _sync: {
        attachments: [],
      },
      ...model,
    },
  })),
})

export const getAttachment = async (): Promise<{ value: Buffer }> => {
  return { value: Buffer.from('mock') }
}
