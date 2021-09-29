/*!
 * © 2021 Atypon Systems LLC
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

export const replaceReferences = (
  doc: Document,
  files: Map<string, string>
): string => {
  const nodes = doc.querySelectorAll<HTMLElement>('[src],[href]')

  const replacePath = (src: string | null, attr: string, node: HTMLElement) => {
    if (!src) {
      return
    }
    if (files.has(src)) {
      const path = files.get(src) as string
      node.setAttribute(attr, path)
    }
  }
  for (const node of Array.from(nodes)) {
    replacePath(node.getAttribute('src'), 'src', node)
    replacePath(node.getAttribute('href'), 'href', node)
  }

  return new XMLSerializer().serializeToString(doc)
}

interface FileItem {
  '@ID': string
  'mets:FLocat': {
    '@LOCTYPE': 'URL'
    '@xlink:href': string
  }
}

interface FileGroup {
  '@ID': string
  'mets:file': FileItem[]
}

export const buildFileGroups = (): FileGroup[] => {
  const fileGroups: { [key: string]: FileGroup } = {
    embedHTML: {
      '@ID': 'embedHTML-group',
      'mets:file': [],
    },
  }

  const item: FileItem = {
    '@ID': 'embedHTML-interactive.zip',
    'mets:FLocat': {
      '@LOCTYPE': 'URL',
      '@xlink:href': `file://interactive.zip`,
    },
  }

  fileGroups.embedHTML['mets:file'].push(item)

  return Object.values(fileGroups)
}

export const buildContainer = ({
  doType,
  baseDoi,
  doi,
  title,
  embedWidth,
  embedHeight,
}: {
  doType: string
  baseDoi: string
  doi: string
  title: string
  embedWidth: string
  embedHeight: string
}): string => {
  // eslint-disable-next-line @typescript-eslint/ban-types
  const mods: { [key: string]: string | object | undefined } = {
    '@xmlns:mods': 'http://www.loc.gov/mods/v3',
    '@xsi:schemaLocation':
      'http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods.xsd',
    'mods:identifier': {
      '@type': 'doi',
      '#text': doi,
    },
    'mods:titleInfo': {
      '@ID': 'title',
      'mods:title': {
        '#text': title || '',
      },
    },
    'mods:extension': {
      'atpn:do-extensions': {
        '@xmlns:atpn': 'http://www.atypon.com/digital-objects',
        '@xsi:schemaLocation':
          'http://www.atypon.com/digital-objects http://www.atypon.com/digital-objects/digital-objects.xsd',
        // 'atpn:embedHTML': { '#cdata': html },
        'atpn:baseDoi': baseDoi,
        'atpn:embedWidth': embedWidth,
        'atpn:embedHeight': embedHeight,
      },
    },
  }

  const container = {
    mets: {
      '@xmlns': 'http://www.loc.gov/METS/',
      '@xmlns:mets': 'http://www.loc.gov/METS/',
      '@xmlns:xlink': 'http://www.w3.org/1999/xlink',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@xsi:schemaLocation':
        'http://www.loc.gov/METS/ http://www.loc.gov/standards/mets/mets.xsd',
      '@TYPE': doType,
      'mets:dmdSec': {
        '@xmlns:mets': 'http://www.loc.gov/METS/',
        '@ID': 'DMD',
        'mets:mdWrap': {
          '@MDTYPE': 'MODS',
          'mets:xmlData': {
            'mods:mods': mods,
          },
        },
      },
      'mets:fileSec': {
        '@xmlns:mets': 'http://www.loc.gov/METS/',
        'mets:fileGrp': buildFileGroups(),
      },
      'mets:structMap': {
        'mets:div': {},
      },
    },
  }

  return builder.create(container, { encoding: 'UTF-8' }).end({
    pretty: true,
  })
}
