import express from 'express'

export const wrapAsync = (
  fn: express.RequestHandler
): express.RequestHandler => (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<express.RequestHandler> =>
  Promise.resolve(fn(req, res, next)).catch(next)
