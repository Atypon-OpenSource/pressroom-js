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

type OutputFormat = 'ads' | 'end' | 'isi' | 'ris' | 'wordbib'

const formats: Record<OutputFormat, string> = {
  ads: 'xml2ads',
  end: 'xml2end',
  isi: 'xml2isi',
  ris: 'xml2ris',
  wordbib: 'xml2wordbib',
}

export const convertBibtex = async (
  bibtex: Buffer,
  format: OutputFormat
): Promise<Buffer> => {
  if (!(format in formats)) {
    throw new Error('Unknown format')
  }

  // TODO: bib2xml?
  const convertToXML = promisify(execFile)('biblatex2xml', {
    encoding: 'buffer',
  })

  if (!convertToXML.child.stdin) {
    throw new Error('No stdin')
  }

  convertToXML.child.stdin.write(bibtex)
  convertToXML.child.stdin.end()

  const { stdout: xml } = await convertToXML

  const convertToFormat = promisify(execFile)(formats[format], {
    encoding: 'buffer',
  })

  if (!convertToFormat.child.stdin) {
    throw new Error('No stdin')
  }

  convertToFormat.child.stdin.write(xml)
  convertToFormat.child.stdin.end()

  const { stdout: output } = await convertToFormat

  return output
}
