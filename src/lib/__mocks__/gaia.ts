import fs from 'fs-extra'

export const convertJATSToWileyML = async (): Promise<string> =>
  fs.readFile(__dirname + '/__fixtures__/manuscript-wileyml.xml', 'UTF-8')
