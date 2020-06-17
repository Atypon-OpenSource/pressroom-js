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

// https://dlmf.nist.gov/LaTeXML/docs.html

const STYLESHEET = __dirname + '/latexml/LaTeXML-jats.xsl'

export const convertLatexToJATS = async ({
  dir,
  inputPath,
  outputPath,
}: {
  dir: string
  inputPath: string
  outputPath: string
}): Promise<void> => {
  const xmlFile = dir + '/latexml.xml'

  // convert LaTeX to XML
  await promisify(execFile)('latexml', ['--destination', xmlFile, inputPath], {
    cwd: dir,
  })

  // convert XML to JATS
  await promisify(execFile)(
    'latexmlpost',
    [
      '--format=jats',
      `--stylesheet=${STYLESHEET}`,
      xmlFile,
      '--destination',
      outputPath,
    ],
    {
      cwd: dir,
    }
  )
}
