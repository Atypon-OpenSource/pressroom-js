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

import { Client } from 'basic-ftp'
import { AccessOptions } from 'basic-ftp/dist/Client'
import { Readable } from 'stream'

export const depositFTPS = async (
  input: Readable,
  remoteFilePath: string,
  options: AccessOptions
): Promise<void> => {
  const client = new Client()
  // client.ftp.verbose = true
  await client.access(options)
  await client.uploadFrom(input, remoteFilePath)
  await client.close()
}
