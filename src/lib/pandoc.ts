import { execFile } from 'child_process'
import { promisify } from 'util'

export const pandoc = async (
  inputPath: string,
  outputPath: string,
  args: string[],
  cwd: string
): Promise<void> => {
  await promisify(execFile)(
    'pandoc',
    [...args, '--output', outputPath, inputPath],
    { cwd }
  )
}
