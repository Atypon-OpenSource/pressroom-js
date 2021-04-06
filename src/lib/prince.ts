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
import { execFile } from 'child_process'
import { promisify } from 'util'

export const DEFAULT_CSS = __dirname + '/../assets/css/print.css'

export const prince = async (
  cwd: string,
  inputPath: string,
  outputPath: string,
  options: {
    css?: string
    js?: string
  } = {}
): Promise<void> => {
  const args = []
  if (options.js) {
    args.push(`--script`)
    args.push(options.js)
  }

  const { stdout, stderr } = await promisify(execFile)(
    'prince',
    [
      inputPath,
      '--output',
      outputPath,
      '--style',
      options.css || DEFAULT_CSS,
      // '--fail-dropped-content',
      // '--fail-missing-resources',
      // '--fail-missing-glyphs',
      // '--no-artificial-fonts',
      // '--no-network',
      // '--javascript',
      // '--tagged-pdf',
      ...args,
    ],
    { cwd }
  )

  if (stdout) {
    console.log(stdout)
  }

  if (stderr) {
    console.warn(stderr)
  }
}
