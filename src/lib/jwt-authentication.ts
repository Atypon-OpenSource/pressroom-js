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
import express from 'express'
import jwt from 'express-jwt'
import jwksRsa from 'jwks-rsa'

import { config } from './config'

const disabledAuthentication: express.RequestHandler = (req, res, next) => {
  next()
}

export const jwtAuthentication = (scope: string): express.RequestHandler =>
  config.authentication.disabled
    ? disabledAuthentication
    : jwt({
        secret: jwksRsa.expressJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `${config.jwt.root}/api/v1/project/${scope}.jwks`,
        }),
        issuer: config.jwt.issuer,
        audience: scope,
        algorithms: ['RS256'],
      })
