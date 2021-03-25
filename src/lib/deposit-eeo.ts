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

import { config } from './config'

interface Token {
  access_token: string
  scope: 'eeoDeposit'
  token_type: 'bearer'
  expires_in: number
}

const client = axios.create({
  baseURL: config.literatum.eeo.url,
})

interface Options {
  async: boolean
  journalName: string
  manuscriptID: string
  notificationURL: string
  pdf: Buffer
  xml: Buffer
}

export const depositEEO = async ({
  journalName,
  manuscriptID,
  notificationURL,
  pdf,
  xml,
  async,
}: Options): Promise<string> => {
  const { username, password } = config.literatum.eeo

  const { data: token } = await client.post<Token>(
    '/v1/api/oauth2/token',
    null,
    {
      auth: { username, password },
      params: {
        grant_type: 'client_credentials',
      },
    }
  )

  if (!token) {
    throw new Error('Could not authenticate')
  }

  const form = new FormData()
  // endpoint fails when passing the files as a stream
  form.append('frontMatterJats', xml, 'manuscript.xml')
  form.append('submissionFile', pdf, 'manuscript.pdf')
  form.append('submissionId', manuscriptID)
  form.append('journalName', journalName)
  form.append('notificationCallbackUrl', notificationURL)
  // should be true for production
  form.append('async', async.toString())

  const { status, data } = await client.post<{
    errorMessage?: string
    queued: string
  }>('v1/api/eeo/deposit', form, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      ...form.getHeaders(),
      'Content-Length': form.getLengthSync(),
    },
    params: {
      scope: 'eeoDeposit',
    },
  })

  if (status === 500) {
    throw Error(data.errorMessage)
  }
  if (data.errorMessage) {
    throw createHttpError(400, data.errorMessage)
  }
  if (data.queued == 'true') {
    return 'Submission queued'
  }

  return 'Submitted successfully'
}
