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
import jwt from 'express-jwt'
import createHttpError from 'http-errors'
import jwksRsa from 'jwks-rsa'

import { config } from './config'

export const apiKeyAuthentication: RequestHandler = (req, res, next) => {
  if (req.headers['pressroom-api-key'] !== config.api_key) {
    throw createHttpError(401, 'Incorrect API key')
  }
  req.user = {}
  next()
}

export const jwtAuthentication = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `${config.jwt.root}/.well-known/jwks.json`,
  }),
  issuer: config.jwt.issuer,
  audience: 'pressroom-js',
  algorithms: ['RS256'],
})

export const authentication: RequestHandler = (req, res, next) => {
  if (config.api_key && 'pressroom-api-key' in req.headers) {
    apiKeyAuthentication(req, res, next)
  } else {
    jwtAuthentication(req, res, next)
  }
}
