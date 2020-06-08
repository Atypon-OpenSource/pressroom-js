import { pandoc } from './pandoc'

export const createPDF = async (
  dir: string,
  inputPath: string,
  outputPath: string
): Promise<void> =>
  pandoc(
    inputPath,
    outputPath,
    [
      '--standalone',
      '--from=jats',
      '--to=pdf',
      '--filter=pandoc-citeproc',
      '--filter=mathjax-pandoc-filter',
      '--pdf-engine=prince',
      `--pdf-engine-opt=--style=${__dirname}/pdf/pandoc-article.css`,
    ],
    dir
  )
