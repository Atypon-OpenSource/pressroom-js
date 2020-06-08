import fs from 'fs-extra'

export const convertWordToJATS = async (): Promise<Buffer> =>
  fs.readFile(__dirname + '/__fixtures__/arc-output.zip')
