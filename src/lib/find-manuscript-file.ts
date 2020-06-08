import fs from 'fs-extra'
import path from 'path'

const manuscriptExtensionToPandocFormatMap = new Map<string, string>([
  ['.tex', 'latex'],
  ['.latex', 'latex'],
  ['.md', 'markdown'],
  ['.xml', 'jats'],
])

// find the main manuscript file (a file with .md, .tex, .xml etc extension)
export const findManuscriptFile = async (
  dir: string
): Promise<{ file: string; format: string }> => {
  const files = await fs.readdir(dir)

  for (const [
    extension,
    format,
  ] of manuscriptExtensionToPandocFormatMap.entries()) {
    for (const file of files) {
      if (path.extname(file) === extension) {
        return { file, format }
      }
    }
  }

  throw new Error('Manuscript file not found')
}
