import { pandoc } from './pandoc'

export const createDocx = (
  dir: string,
  inputPath: string,
  outputPath: string
): Promise<void> =>
  pandoc(
    inputPath,
    outputPath,
    ['--standalone', '--from=jats', '--to=docx', '--filter=pandoc-citeproc'],
    dir
  )
