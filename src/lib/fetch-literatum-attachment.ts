import axios from 'axios'
import fs from 'fs-extra'

const client = axios.create()

export const fetchAttachment = async (
  attachment: { name: string; url: string },
  dir: string
): Promise<void> => {
  const output = fs.createWriteStream(dir + '/' + attachment.name)

  const { data } = await client.get(attachment.url, {
    responseType: 'stream',
  })

  data.pipe(output)

  return new Promise((resolve, reject) => {
    output.on('finish', resolve)
    output.on('error', reject)
  })
}
