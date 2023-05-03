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
import fs from 'fs'
import client from 'prom-client'

const metricsMap = [
  {
    name: 'json_schema_version_info',
    packageName: 'json-schema',
    help: 'The json-schema version by package.json',
    labelNames: ['version', 'major', 'minor', 'patch'],
  },
  {
    name: 'transformer_version_info',
    packageName: 'transform',
    help: 'The transform version by package.json',
    labelNames: ['version', 'major', 'minor', 'patch'],
  },
  {
    name: 'requirements_version_info',
    packageName: 'requirements',
    help: 'The requirements version by package.json',
    labelNames: ['version', 'major', 'minor', 'patch'],
  },
]
export function configurePromClientRegistry() {
  for (const metric of metricsMap) {
    if (!client.register.getSingleMetric(metric.name)) {
      const gauge = new client.Gauge({
        name: metric.name,
        help: metric.help,
        labelNames: metric.labelNames,
      })
      const processedVersion = processVersion(metric.packageName)
      gauge
        .labels(processedVersion.version, ...processedVersion.versionParts)
        .set(1)
    }
  }
}
function processVersion(packageName: string): {
  version: string
  versionParts: string[]
} {
  const versionFromNodeModule = getVersion(packageName)
  const vSplit = versionFromNodeModule.split('.')
  return {
    version: versionFromNodeModule,
    versionParts: [vSplit[0], vSplit[1], vSplit[2]],
  }
}

function getVersion(packageName: string): string {
  const f1 = fs.readFileSync(
    `./node_modules/@manuscripts/${packageName}/package.json`,
    'utf-8'
  )
  const jsonPackageFile = JSON.parse(f1)
  return jsonPackageFile.version
}
