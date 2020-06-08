import fs from 'fs-extra'
import path from 'path'

export const pandoc = async (
  inputPath: string,
  outputPath: string,
  args: string[],
  dir: string
): Promise<void> => {
  const file = path.join(dir, outputPath)

  if (outputPath.endsWith('.xml')) {
    const buffer = await fs.readFile(
      __dirname + '/__fixtures__/manuscript-jats.xml'
    )
    await fs.writeFile(file, buffer)
  } else {
    await fs.createFile(file)
  }
}
