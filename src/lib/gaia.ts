import axios from 'axios'

import { config } from './config'

const client = axios.create({
  baseURL: config.gaia.url,
})

export const convertJATSToWileyML = async (xml: string): Promise<string> => {
  const { data } = await client.post<string>('/', {
    documents: {
      $: {
        type: 'string',
        string: xml,
      },
    },
    arguments: {},
  })

  return data
}
