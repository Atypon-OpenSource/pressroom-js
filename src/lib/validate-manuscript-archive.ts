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
import fs from 'fs-extra'
import createHttpError from 'http-errors'

import { logger } from './logger'
import { unzip } from './unzip'

export const decompressManuscript: RequestHandler = async (req, res, next) => {
  const dir = req.tempDir
  // @ts-ignore
  const name = req.file?.originalname
  if (!name?.endsWith('.zip') && !name?.endsWith('.manuproj')) {
    return next(createHttpError(400, `Only ZIP files are allowed`))
  }
  logger.debug(`Extracting ZIP archive to ${dir}`)
  // @ts-ignore
  await unzip(req.file.buffer, dir)
  const manuscriptJSONPath = dir + '/index.manuscript-json'
  if (!fs.existsSync(manuscriptJSONPath)) {
    return next(createHttpError(400, 'index.manuscript-json not found'))
  }

  try {
    // read the data
    fs.readJSONSync(manuscriptJSONPath)
  } catch (e) {
    return next(
      createHttpError(400, 'index.manuscript-json is not a valid JSON')
    )
  }
  next()
}
