import { RequestHandler } from 'express'
import createError from 'http-errors'

export const confirmProjectAccess: RequestHandler = (req, res, next) => {
  if (req.user.containerID !== req.params.projectID) {
    throw createError(401)
  }

  next()
}
