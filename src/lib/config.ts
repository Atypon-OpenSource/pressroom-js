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

const booleanEnvironmentVariable = (name: string) => {
  const value = environmentVariable(name)

  if (!value || value === '0' || value === 'false') {
    return false
  }

  return true
}

interface Config {
  api_key: string
  authorization: {
    emails: string
  }
  jwt: {
    enabled: boolean
    issuer: string
    root: string
  }
}

export const config: Config = {
  api_key: environmentVariable('PRESSROOM_API_KEY'),
  authorization: {
    emails: environmentVariable('PRESSROOM_AUTHORIZATION_EMAILS'),
  },
  jwt: {
    enabled: booleanEnvironmentVariable('PRESSROOM_JWT_ENABLED'),
    issuer: environmentVariable('PRESSROOM_JWT_ISSUER'),
    root: environmentVariable('PRESSROOM_JWT_ROOT'),
  },
}
