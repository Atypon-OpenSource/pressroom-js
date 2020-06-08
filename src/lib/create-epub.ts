import { pandoc } from './pandoc'

export const createEpub = (
  dir: string,
  inputPath: string,
  outputPath: string
): Promise<void> =>
  pandoc(
    inputPath,
    outputPath,
    ['--standalone', '--from=jats', '--to=epub', '--filter=pandoc-citeproc'],
    dir
  )
