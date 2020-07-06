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
import { AxiosError } from 'axios'
import express from 'express'
import getStream from 'get-stream'
import { Stream } from 'stream'

import { logger } from './logger'

export const isAxiosError = <T>(error: Error): error is AxiosError<T> =>
  (error as AxiosError).isAxiosError

export const errorResponder: express.ErrorRequestHandler = (
  error,
  req,
  res,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next
) => {
  if (isAxiosError(error) && error.response) {
    const { status, data } = error.response

    // TODO: what is useful to log from the response?
    if (data instanceof Stream) {
      // eslint-disable-next-line promise/no-promise-in-callback,promise/catch-or-return
      getStream(data).then(logger.error)
    } else if (data instanceof Buffer) {
      logger.error(data.toString())
    } else {
      logger.error(data as string)
    }

    // TODO: pass through the response like this?
    res.status(status).send(data)
  } else {
    res.status(error.status || 500).json({
      type: 'error',
      message: error.message,
    })
  }
}
