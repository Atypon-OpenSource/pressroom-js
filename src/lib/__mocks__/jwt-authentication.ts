import express from 'express'

import { config } from '../config'

export const jwtAuthentication = (scope: string): express.RequestHandler => (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  req.user = {
    containerID: 'MPProject:test',
    audience: scope,
    arc: config.arc,
  }
  next()
}
