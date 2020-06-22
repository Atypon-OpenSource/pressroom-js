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
import getStream from 'get-stream'
import stream from 'stream'

export interface EdifixCredentials extends Record<string, string> {
  username: string
  password: string
}

// https://edifix.com/api_doc
const client = axios.create({
  baseURL: 'https://edifix.com/api',
})

export const convertBibliographyToJATS = async (
  references: stream.Readable,
  editorialStyle: string,
  credentials: EdifixCredentials
): Promise<stream.Readable> => {
  const { data } = await client.post<stream.Readable>(
    '/v1/jobs.xml',
    {
      ...credentials,
      edit_style: editorialStyle,
      mtxt_input_refs: await getStream(references),
      b_book_processing: 'true',
      b_remove_bad_line_breaks: 'true',
      pubmed: '1',
      crossref: '1',
    },
    {
      headers: {
        Accept: 'application/xml',
      },
      responseType: 'stream',
    }
  )

  return data
}
