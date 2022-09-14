/* eslint-disable */
/*!
 * © 2022 Atypon Systems LLC
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

import { ContainedModel } from '@manuscripts/manuscript-transform'
import axios from 'axios'
// import FormData from 'form-data'
// import fs from 'fs'
// import getStream from 'get-stream'
// import stream from 'stream'

import { AttachmentData } from './attachments'

export const IndesignClient = axios.create({
  baseURL: 'IndesignClientUrl',
})

export const createPdfJob = async (
  dir: string,
  _data: Array<ContainedModel>,
  _manuscriptID: string,
  _imageDir = 'graphic',
  _attachments: Array<AttachmentData>,
  _theme?: string,
  _articleOptions?: {
    allowMissingElements: boolean
    generateSectionLabels: boolean
  }
): Promise<string> => {

  // const form = new FormData()
  // const readStream = fs.createReadStream(dir + filename)
  // //do we zip the files or just send each file as a form data?
  // //what is the api expected input.
  // form.append('file', readStream, filename) //whateverFiles we need to send
  // const headers = {
  //   /* authentication and other headers */
  // }
  // const {
  //   data: { id },
  // } = await IndesignClient.post<{ id: string }>('/files', form, {
  //   headers: headers,
  // })

  return ''
}

export const jobStatus = async (job_id: string): Promise<string> => {
  // const headers = {
  //   /* authentication and other headers */
  // }
  // const {
  //   data: { submission_status: status },
  // } = await IndesignClient.get<{ submission_status: string }>('/status', {
  //   params: { job_id },
  //   headers: headers,
  // })

  // return status
  return ''
}

//TODO: remove null
export const jobResult = async (job_id: string): Promise<Buffer | null> => {
  // const headers = {
  //   /* authentication and other headers */
  // }
  // const { data: output } = await IndesignClient.get<stream.Readable>(
  //   '/download',
  //   {
  //     params: { job_id },
  //     headers: headers,
  //     responseType: 'stream',
  //   }
  // )
  // return await getStream.buffer(output)
  return null
}
