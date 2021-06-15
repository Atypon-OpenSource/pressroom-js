/*!
 * © 2021 Atypon Systems LLC
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

export const parseSupplementaryDOIs: RequestHandler = async (
  req,
  res,
  next
): Promise<void> => {
  const { supplementaryMaterialDOIs } = req.body
  if (supplementaryMaterialDOIs) {
    try {
      req.body['supplementaryMaterialDOIs'] = JSON.parse(
        supplementaryMaterialDOIs
      )
    } catch (e) {
      next(
        createHttpError(400, `Invalid supplementaryMaterialDOIs format: ${e})`)
      )
    }
  } else {
    req.body['supplementaryMaterialDOIs'] = []
  }
  next()
}
