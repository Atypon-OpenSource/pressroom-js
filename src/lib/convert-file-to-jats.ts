import { pandoc } from './pandoc'

export const convertFileToJATS = async ({
  dir,
  inputPath,
  outputPath,
  from,
}: {
  dir: string
  inputPath: string
  outputPath: string
  from: string
}): Promise<void> =>
  pandoc(
    inputPath,
    outputPath,
    [
      '--standalone',
      `--from=${from}`,
      `--to=jats`,
      '--filter=pandoc-citeproc',
      // '--filter=mathjax-pandoc-filter',
    ],
    dir
  )
