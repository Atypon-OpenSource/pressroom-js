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

import builder from 'xmlbuilder'

interface ProcessingInstructions {
  priorityLevel: 'high'
  makeLiveCondition?: 'no-errors'
}

const buildProcessingInstructions = (
  processingInstructions: ProcessingInstructions
) => ({
  priority: {
    '@level': processingInstructions.priorityLevel,
  },
  // 'make-live': {
  //   '@on-condition': processingInstructions.makeLiveCondition,
  // },
})

interface ManifestOptions {
  groupDoi: string
  processingInstructions?: ProcessingInstructions
  submissionType: 'full' | 'partial'
}

export const buildManifest = ({
  groupDoi,
  processingInstructions,
  submissionType,
}: ManifestOptions): string => {
  const manifest = {
    submission: {
      '@dtd-version': '4.2',
      '@submission-type': submissionType,
      '@group-doi': groupDoi,
      'processing-instructions': processingInstructions
        ? buildProcessingInstructions(processingInstructions)
        : undefined,
    },
  }

  const options = {
    encoding: 'UTF-8',
    pubID:
      '-//Atypon//DTD Literatum Content Submission Manifest DTD v4.2 20140519//EN',
    sysID: 'manifest.4.2.dtd',
  }

  return builder.create(manifest, options).end({
    pretty: true,
  })
}
