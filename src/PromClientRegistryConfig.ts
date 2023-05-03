/*!
 * © 2023 Atypon Systems LLC
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
import client from 'prom-client'

import pjson from '../package.json'

const metricsMap = [
  {
    name: 'app_version',
    value: pjson.version,
    help: 'The API version by package.json',
    labelNames: ['version'],
  },
  {
    name: 'json_schema_version',
    value: pjson.dependencies['@manuscripts/json-schema'],
    help: 'The json-schema version by package.json',
    labelNames: ['version'],
  },
  {
    name: 'transformer_version',
    value: pjson.dependencies['@manuscripts/transform'],
    help: 'The transform version by package.json',
    labelNames: ['version'],
  },
  {
    name: 'requirements_version',
    value: pjson.dependencies['@manuscripts/requirements'],
    help: 'The requirements version by package.json',
    labelNames: ['version'],
  },
]
export function configurePromClientRegistry() {
  client.register.clear()
  for (const metric of metricsMap) {
    if (!client.register.getSingleMetric(metric.name)) {
      const gauge = new client.Gauge({
        name: metric.name,
        help: metric.help,
        labelNames: metric.labelNames,
      })
      gauge.labels(metric.value).set(1)
    }
  }
}
