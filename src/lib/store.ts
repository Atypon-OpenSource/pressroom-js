/*!
 * © 2020 Atypon Systems LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
