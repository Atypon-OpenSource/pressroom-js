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
import createHttpError from 'http-errors'

import { config } from './config'

const allowed = new RegExp(config.authorization.emails)

export const emailAuthorization: RequestHandler = (req, res, next) => {
  if (!config.jwt.disabled) {
    const { email } = req.user

    if (!email) {
      throw createHttpError(
        401,
        'No email address found in authentication token'
      )
    }

    if (!allowed.test(email)) {
      throw createHttpError(
        401,
        'Access to this endpoint is restricted by email address domain'
      )
    }
  }

  next()
}
