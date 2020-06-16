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
import AxiosMockAdapter from 'axios-mock-adapter'
import FormData from 'form-data'
import fs from 'fs-extra'
import stream from 'stream'

import { config } from '../config'
import { convertWordToJATS } from '../extyles-arc'

const mockInputFile = __dirname + '/../__mocks__/__fixtures__/arc-input.docx'
const mockOutputFile = __dirname + '/../__mocks__/__fixtures__/arc-output.zip'

describe('eXtyles Arc', () => {
  test('makes API calls as expected', async () => {
    const called = {
      login: 0,
      create_job: 0,
      check_job_status: 0,
      get_results: 0,
    }

    const mockClient = new AxiosMockAdapter(axios)

    mockClient
      .onPost('https://www.extylesarc.com/api/login')
      .reply(async (requestConfig) => {
        expect(JSON.parse(requestConfig.data)).toStrictEqual(config.arc)

        called.login++

        return [200, { status: 'ok', token: 'test' }]
      })

    mockClient
      .onPost('https://www.extylesarc.com/api/create_job')
      .reply(async (requestConfig) => {
        expect(requestConfig.data).toBeInstanceOf(FormData)
        expect(requestConfig.headers).toHaveProperty('token', 'test')
        expect(requestConfig.headers).toHaveProperty('Content-Type')

        called.create_job++

        return [200, { job_id: 'test' }]
      })

    const jobStatuses = ['NEW', 'RUNNING', 'FINISHED']

    mockClient
      .onGet('https://www.extylesarc.com/api/check_job_status')
      .reply(async (requestConfig) => {
        expect(requestConfig.params).toStrictEqual({ job_id: 'test' })
        expect(requestConfig.headers).toHaveProperty('token', 'test')

        const status = jobStatuses[called.check_job_status]

        called.check_job_status++

        return [200, { job_status: status }]
      })

    mockClient
      .onGet('https://www.extylesarc.com/api/get_results')
      .reply(async (requestConfig) => {
        expect(requestConfig.params).toStrictEqual({ job_id: 'test' })
        expect(requestConfig.headers).toHaveProperty('token', 'test')

        called.get_results++

        return [200, fs.createReadStream(mockOutputFile)]
      })

    const input = fs.createReadStream(mockInputFile)

    const result = await convertWordToJATS(input, '.docx', config.arc)
    expect(result).toBeInstanceOf(stream.Readable)

    expect(called).toStrictEqual({
      login: 1,
      create_job: 1,
      check_job_status: 3,
      get_results: 1,
    })
  })
})
