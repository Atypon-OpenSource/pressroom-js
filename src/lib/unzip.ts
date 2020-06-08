import decompress from 'decompress'

export const unzip = (
  zip: Buffer | string,
  dir: string
): Promise<decompress.File[]> =>
  decompress(zip, dir, {
    map: (file) => {
      if (file.type === 'file' && file.path.endsWith('/')) {
        file.type = 'directory'
      }
      return file
    },
  })
