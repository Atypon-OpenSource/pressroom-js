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
import fs from 'fs-extra'
import createHttpError from 'http-errors'

import { logger } from './logger'
import { prince } from './prince'

export const creatPrincePDF = async (
  dir: string,
  html: string,
  theme?: string
): Promise<string> => {
  await fs.writeFile(dir + '/manuscript.html', html)

  const options: {
    css?: string
    js?: string
  } = {}
  if (theme) {
    const themePath = __dirname + `/../assets/themes/${theme}/`
    const cssPath = themePath + 'print.css'
    if (!fs.existsSync(cssPath)) {
      throw createHttpError(400, `${theme} theme not found`)
    }
    options.css = cssPath
    const jsPath = themePath + 'print.js'
    // ignore when there is no js file?
    if (fs.existsSync(jsPath)) {
      options.js = jsPath
    } else {
      logger.debug(`No JS file for ${theme}`)
    }
  }
  try {
    await prince(dir, 'manuscript.html', 'manuscript.pdf', options)

    return `${dir}/manuscript.pdf`
  } catch (e) {
    throw new Error('unable to create pdf via prince-html')
  }
}
