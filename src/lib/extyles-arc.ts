/*!
 * © 2020 Atypon Systems LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import axios from 'axios'
import FormData from 'form-data'
import createHttpError from 'http-errors'
import stream from 'stream'

import { logger } from './logger'

export interface ExtylesArcCredentials extends Record<string, string> {
  username: string
  password: string
  api_key: string
}

export const extylesClient = axios.create({
  baseURL: 'https://www.extylesarc.com/api',
})

export const convertWordToJATS = async (
  file: stream.Readable,
  extension: string,
  authentication: ExtylesArcCredentials
): Promise<stream.Readable> => {
  // TODO: cache the token and login again when it expires?
  const token = await login(authentication)

  const job_id = await createJob(file, extension, token)

  const interval = process.env.NODE_ENV === 'test' ? 100 : 10000 // poll every 10 seconds
  let attempts = 600000 / interval // timeout after 10 mins

  do {
    const finishedJob = await isFinishedJob(job_id, token)
    if (finishedJob) {
      break
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  } while (--attempts)

  logger.debug(`Downloading ${job_id}…`)

  return await getResult(job_id, token)
}

export const isFinishedJob = async (
  job_id: string,
  token: string
): Promise<boolean> => {
  const {
    data: { job_status: status },
  } = await extylesClient.get<{ job_status: string }>('/check_job_status', {
    params: { job_id },
    headers: { token },
  })

  logger.debug(`Job ${job_id}: status ${status}`)

  if (status === 'FINISHED') {
    return true
  }

  if (status === 'ERROR') {
    throw new Error()
  }
  return false
}

export const login = async (
  authentication: ExtylesArcCredentials
): Promise<string> => {
  const {
    data: { message, status, token },
  } = await extylesClient.post<{
    message: string
    status: string
    token: string
  }>('/login', authentication)

  if (status !== 'ok' || !token) {
    throw createHttpError(401, `Error signing in: ${message}`)
  }
  return token
}

export const createJob = async (
  file: stream.Readable,
  extension: string,
  token: string
): Promise<string> => {
  const form = new FormData()
  form.append('input_file_name', `manuscript${extension}`)
  form.append('input_file_type', 'FULLTEXT_WITH_IMAGES')
  form.append('editorial_style', 'APA')
  form.append('file', file, 'manuscript.docx')

  const {
    data: { job_id },
  } = await extylesClient.post<{ job_id: string }>('/create_job', form, {
    headers: { token, ...form.getHeaders() },
  })

  return job_id
}

export const getResult = async (
  job_id: string,
  token: string
): Promise<stream.Readable> => {
  const { data: output } = await extylesClient.get<stream.Readable>(
    '/get_results',
    {
      params: { job_id },
      headers: { token },
      responseType: 'stream',
    }
  )

  return output
}
