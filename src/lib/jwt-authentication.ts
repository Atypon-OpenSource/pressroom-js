import jwt, { RequestHandler } from 'express-jwt'
import jwksRsa from 'jwks-rsa'

import { config } from './config'

export const jwtAuthentication = (scope: string): RequestHandler =>
  jwt({
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
