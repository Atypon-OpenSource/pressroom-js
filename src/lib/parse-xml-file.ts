import fs from 'fs-extra'

export const parseXMLFile = async (path: string): Promise<Document> => {
  const xml = await fs.readFile(path, 'UTF-8')

  return new DOMParser().parseFromString(xml, 'application/xml')
}
