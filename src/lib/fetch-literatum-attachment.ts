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
import axios from 'axios'
import fs from 'fs-extra'

const client = axios.create()

export const fetchAttachment = async (
  attachment: { name: string; url: string },
  dir: string
): Promise<void> => {
  const output = fs.createWriteStream(dir + '/' + attachment.name)

  const { data } = await client.get(attachment.url, {
    responseType: 'stream',
  })

  data.pipe(output)

  return new Promise((resolve, reject) => {
    output.on('finish', resolve)
    output.on('error', reject)
  })
}
