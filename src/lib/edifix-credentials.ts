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

import { RequestHandler } from 'express'

export const edifixCredentials: RequestHandler = (req, res, next) => {
  const header = req.headers['pressroom-edifix-secret']
  if (header) {
    const data = Array.isArray(header) ? header[0] : header
    const decodedSecret = Buffer.from(data, 'base64').toString()
    const [username, password] = decodedSecret.split(':')

    if (!username || !password) {
      throw new Error('Invalid Pressroom-Edifix-Secret')
    }
    req.user = {
      ...req.user,
      edifix: { username, password },
    }
  } else {
    // celebrate will make sure this will not happen
    throw new Error('Pressroom-Edifix-Secret is required')
  }
  next()
}
