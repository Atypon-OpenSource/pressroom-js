import axios from 'axios'
import FormData from 'form-data'

import { logger } from './logger'

const client = axios.create({
  baseURL: 'https://www.extylesarc.com/api/',
})

client.interceptors.request.use((config) => {
  console.log(config.baseURL + axios.getUri(config))
  console.log(config.data)
  return config
})

export interface ExtylesArcAuthentication extends Record<string, string> {
  username: string
  password: string
  api_key: string
}

export const convertWordToJATS = async (
  buffer: Buffer,
  authentication: ExtylesArcAuthentication
): Promise<Buffer> => {
  // TODO: cache the token and login again when it expires?
  const {
    data: { message, status, token },
  } = await axios.post<{
    message: string
    status: string
    token: string
  }>('https://www.extylesarc.com/api/login', authentication)

  if (status !== 'ok' || !token) {
    throw new Error(`Error signing in: ${message}`)
  }

  const form = new FormData()
  form.append('input_file_name', 'manuscript.docx')
  form.append('input_file_type', 'FULLTEXT_WITH_IMAGES')
  form.append('editorial_style', 'APA')
  form.append('file', buffer, 'manuscript.docx')

  const {
    data: { job_id },
  } = await client.post<{ job_id: string }>('create_job', form.getBuffer(), {
    headers: { token, ...form.getHeaders() },
  })

  const interval = 10000 // poll every 10 seconds
  let attempts = 600000 / interval // timeout after 10 mins

  do {
    const {
      data: { job_status: status },
    } = await client.get<{ job_status: string }>('check_job_status', {
      params: { job_id },
      headers: { token },
    })

    logger.debug(`Job ${job_id}: status ${status}`)

    if (status === 'FINISHED') {
      break
    }

    if (status === 'ERROR') {
      throw new Error()
    }

    await new Promise((resolve) => setTimeout(resolve, interval))
  } while (--attempts)

  logger.debug(`Downloading ${job_id}…`)

  const { data: output } = await client.get<Buffer>('get_results', {
    params: { job_id },
    headers: { token },
    responseType: 'arraybuffer',
  })

  return output
}
