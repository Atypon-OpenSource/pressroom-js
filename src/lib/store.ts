import { ContainedModel } from '@manuscripts/manuscript-transform'
import couchbase from 'couchbase'

import { config } from './config'

const cluster = new couchbase.Cluster(config.couchbase.connection, {
  // @ts-ignore
  username: config.couchbase.username,
  password: config.couchbase.password,
})

// @ts-ignore
const collection = cluster.bucket(config.couchbase.bucket).defaultCollection()

export interface Row {
  id: string
  projects: ContainedModel & {
    _sync: { attachments: Array<{ content_type: string; digest: string }> }
  }
}

export const getContainedResources = (
  containerID: string
): Promise<{ rows: Row[] }> =>
  // @ts-ignore
  cluster.query(
    `SELECT *, META().id FROM \`${config.couchbase.bucket}\` WHERE projectID = $1 OR containerID = $1`,
    {
      parameters: [containerID],
    }
  )

export const getAttachment = (attachment: {
  digest: string
}): Promise<{ value: Buffer }> =>
  collection.get(`_sync:att:${attachment.digest}`, {
    xattr: true,
  })
