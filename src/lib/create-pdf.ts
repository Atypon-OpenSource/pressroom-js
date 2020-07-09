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
import { DEFAULT_CSL, pandoc } from './pandoc'

const DEFAULT_CSS = __dirname + '/../assets/pandoc/example.css'

export type PDFEngine = 'prince' | 'xelatex' | 'weasyprint' | 'tectonic'

export const createPDF = async (
  dir: string,
  inputPath: string,
  outputPath: string,
  engine: PDFEngine = 'prince',
  options?: {
    csl?: string
    css?: string
  }
): Promise<void> => {
  const args = [
    '--standalone',
    '--from=jats',
    '--to=pdf',
    '--filter=pandoc-citeproc',
    // '--filter=mathjax-pandoc-filter',
    `--csl=${options?.csl || DEFAULT_CSL}`,
    `--pdf-engine=${engine}`,
  ]

  switch (engine) {
    case 'prince':
      args.push(`--pdf-engine-opt=--style=${options?.css || DEFAULT_CSS}`)
      break

    case 'weasyprint':
      args.push(`--metadata=mathjax.noInlineSVG:true`)
      args.push(`--pdf-engine-opt=--stylesheet=${options?.css || DEFAULT_CSS}`)
      break
  }

  return pandoc(inputPath, outputPath, args, dir)
}
