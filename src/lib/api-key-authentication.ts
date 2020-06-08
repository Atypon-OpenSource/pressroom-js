import { RequestHandler } from 'express'

import { config } from './config'

export const apiKeyAuthentication: RequestHandler = (req, res, next) => {
  if (req.headers['pressroom-api-key'] !== config.api_key) {
    throw new Error('Incorrect API key')
  }
  next()
}
