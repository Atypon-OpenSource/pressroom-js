import { Archiver } from 'archiver'
import { Response } from 'express'

export const sendArchive = async (
  res: Response,
  archive: Archiver,
  filename = 'manuscript.zip'
): Promise<void> => {
  res.attachment(filename)
  res.set('Content-Type', 'application/zip')
  // TODO: Content-Length?
  archive.pipe(res)
}
