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
const environmentVariable = (name: string): string => {
  const value = process.env[name]

  if (value === undefined || value === '') {
    if (process.env.NODE_ENV === 'test') {
      return ''
    } else {
      throw new Error(`Missing environment variable ${name}`)
    }
  }

  return value
}

interface Config {
  api_key: string
  arc: {
    api_key: string
    password: string
    username: string
  }
  couchbase: {
    bucket: string
    connection: string
    password: string
    username: string
  }
  gaia: {
    url: string
  }
  jwt: {
    issuer: string
    root: string
  }
}

export const config: Config = {
  api_key: environmentVariable('PRESSROOM_API_KEY'),
  arc: {
    api_key: environmentVariable('PRESSROOM_ARC_API_KEY'),
    password: environmentVariable('PRESSROOM_ARC_PASSWORD'),
    username: environmentVariable('PRESSROOM_ARC_USERNAME'),
  },
  couchbase: {
    bucket: environmentVariable('PRESSROOM_COUCHBASE_BUCKET'),
    connection: environmentVariable('PRESSROOM_COUCHBASE_CONNECTION'),
    password: environmentVariable('PRESSROOM_COUCHBASE_PASS'),
    username: environmentVariable('PRESSROOM_COUCHBASE_USER'),
  },
  gaia: {
    url: environmentVariable('PRESSROOM_GAIA_URL'),
  },
  jwt: {
    issuer: environmentVariable('PRESSROOM_JWT_ISSUER'),
    root: environmentVariable('PRESSROOM_JWT_ROOT'),
  },
}
