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
import { Request, Response } from 'express'
import { HttpError } from 'http-errors'

import { authentication } from '../authentication'
import { config } from '../config'

describe('authentication', () => {
  test('allows a valid API key', () => {
    const mockRequest = {
      headers: {
        'pressroom-api-key': config.api_key,
      },
    }

    const mockResponse = {}

    const mockNext = jest.fn()

    // @ts-ignore
    authentication(mockRequest as Request, mockResponse as Response, mockNext)

    expect(mockNext).toBeCalledTimes(1)
  })

  test('rejects an invalid API key', () => {
    const mockRequest = {
      headers: {
        'pressroom-api-key': 'foo',
      },
    }

    const mockResponse = {}

    const mockNext = jest.fn()

    expect(() => {
      // @ts-ignore
      authentication(mockRequest as Request, mockResponse as Response, mockNext)
    }).toThrow(HttpError)
  })
})
