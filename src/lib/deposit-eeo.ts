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
import { Readable } from 'stream'

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
  journalName: string
  manuscriptID: string
  notificationURL: string
  pdf: Readable
  xml: Readable
}

export const depositEEO = async ({
  journalName,
  manuscriptID,
  notificationURL,
  pdf,
  xml,
}: Options): Promise<void> => {
  const { username, password } = config.literatum.eeo

  const { data: token } = await client.post<Token>('/v1/api/oauth2/token', {
    auth: { username, password },
    params: {
      grant_type: 'client_credentials',
      scope: 'eeoDeposit',
    },
  })

  if (!token) {
    throw new Error('Could not authenticate')
  }

  const form = new FormData()
  form.append('frontMatterJats', xml, 'manuscript.xml')
  form.append('submissionFile', pdf, 'manuscript.pdf')
  form.append('submissionId', manuscriptID)
  form.append('journalName', journalName)
  form.append('notificationCallbackUrl', notificationURL)
  form.append('async', 'true')

  const { status } = await client.post<void>('/v1/api/eeo/deposit', form, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    params: {
      grant_type: 'client_credentials',
      scope: 'eeoDeposit',
    },
  })

  if (status !== 202) {
    throw new Error('Deposit was not accepted')
  }
}
