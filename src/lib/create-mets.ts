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
import { hasObjectType } from '@manuscripts/manuscript-transform'
import {
  Contributor,
  Figure,
  Manuscript,
  ManuscriptKeyword,
  Model,
  ObjectTypes,
} from '@manuscripts/manuscripts-json-schema'
import builder from 'xmlbuilder'

// const findAbstractNode = (doc: Document): Node | undefined => {
//   const titleNodes = doc.querySelectorAll<HTMLElement>('article > section > h1')
//
//   for (const titleNode of Array.from(titleNodes)) {
//     if (titleNode.textContent === 'Abstract') {
//       return titleNode.parentNode!
//     }
//   }
// }

interface Content {
  // abstract: string
  article: string
  title: string
}

const extractContent = (html: string, manuscript: Manuscript): Content => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // title

  const titleNode = doc.querySelector<HTMLElement>('header div h1')

  if (!titleNode) {
    throw new Error('No title found in the HTML')
  }

  // remove header figure

  const headerFigure = doc.querySelector<HTMLElement>('header figure')

  if (headerFigure && headerFigure.parentNode) {
    headerFigure.parentNode.removeChild(headerFigure)
  }

  // abstract

  // const abstractNode = findAbstractNode(doc)
  //
  // if (abstractNode && abstractNode.parentNode) {
  //   abstractNode.parentNode.removeChild(abstractNode)
  // }

  // article

  const articleNode = doc.querySelector<HTMLElement>('article')

  if (!articleNode) {
    throw new Error('No article found in the HTML')
  }

  // download link for "unlicensed" images
  const imageNodes = articleNode.querySelectorAll<HTMLImageElement>(
    'figure > img[src]'
  )

  for (const node of Array.from(imageNodes)) {
    if (node.hasAttribute('data-licensed')) {
      continue
    }

    const src = node.getAttribute('src')

    if (!src) {
      continue
    }

    const parts = src.split('/')
    const filename = parts[parts.length - 1]

    const link = document.createElement('a')
    link.textContent = 'Download image'
    link.classList.add('figure-image-download')
    link.setAttribute('href', `/do/${manuscript.DOI}/full/media/${filename}`)

    if (node.parentNode) {
      if (node.nextSibling) {
        node.parentNode.insertBefore(link, node.nextSibling)
      } else {
        node.parentNode.appendChild(link)
      }
    }
  }

  const sectionNode = document.createElement('section')

  while (articleNode.firstChild) {
    sectionNode.appendChild(articleNode.firstChild)
  }

  return {
    article: sectionNode.outerHTML,
    // abstract: abstractNode ? abstractNode.textContent || '' : '',
    title: titleNode.textContent || '', // TODO: convert markup?
  }
}

const isContributor = hasObjectType<Contributor>(ObjectTypes.Contributor)

const findContributors = (modelMap: Map<string, Model>) => {
  const output = []

  for (const model of modelMap.values()) {
    if (isContributor(model) && model.role === 'author') {
      output.push(model)
    }
  }

  return output
}

const buildPubDate = (publicationDate?: number) => {
  const date = publicationDate ? new Date(publicationDate) : new Date() // default to now

  return {
    '@index-full-timestamp': 'true',
    '@encoding': 'iso8601',
    '#text': date.toISOString(),
  }
}

interface FeaturedImageData {
  credit?: string
  caption?: string
}

const buildFeaturedImageData = (
  modelMap: Map<string, Model>,
  headerFigureID?: string
): FeaturedImageData => {
  if (headerFigureID) {
    const headerFigure = modelMap.get(headerFigureID) as Figure | undefined

    if (headerFigure) {
      return {
        credit: headerFigure.credit,
        caption: headerFigure.title,
      }
    }
  }

  return {}
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

const buildFileGroups = (
  files: Map<string, string>,
  featuredImageID?: string
): FileGroup[] => {
  const fileGroups: { [key: string]: FileGroup } = {
    media: {
      '@ID': 'body-group',
      'mets:file': [],
    },
    featureImage: {
      '@ID': 'featureImage-group',
      'mets:file': [],
    },
  }

  for (const [id, path] of files.entries()) {
    const item: FileItem = {
      '@ID': id,
      'mets:FLocat': {
        '@LOCTYPE': 'URL',
        '@xlink:href': `file://${path}`,
      },
    }

    if (featuredImageID && id === featuredImageID) {
      fileGroups.featureImage['mets:file'].push(item)
    } else {
      fileGroups.media['mets:file'].push(item)
    }
  }

  return Object.values(fileGroups)
}

type ModelWithPriority = Model & { priority?: number }

const sortModelsByPriority = (a: ModelWithPriority, b: ModelWithPriority) =>
  Number(a.priority) - Number(b.priority)

const isKeyword = hasObjectType<ManuscriptKeyword>(
  ObjectTypes.ManuscriptKeyword
)

const buildKeywords = (modelMap: Map<string, Model>) => {
  const keywords: ManuscriptKeyword[] = []

  for (const model of modelMap.values()) {
    if (isKeyword(model)) {
      keywords.push(model)
    }
  }

  if (!keywords.length) {
    return undefined
  }

  keywords.sort(sortModelsByPriority)

  // return {
  //   'atpn:keywords': {
  //     '@nested-label': 'none',
  //     nestedValue: keywords.map(keyword => keyword.name),
  //   },
  // }

  return keywords.map((keyword) => ({
    '@nested-label': 'NONE',
    'atpn:nestedValue': keyword.name,
  }))
}

const buildBaseDoi = (doi: string) => {
  const [prefix] = doi.split('/')

  return `${prefix}/magazine-storyclass`
}

const buildSubjects = (manuscript: Manuscript) => {
  const layoutTheme = manuscript.layoutTheme || 'standard'

  const subjects = [
    {
      '@authority': 'themes',
      '@ID': 'theme',
      'mods:topic': {
        '@authority': layoutTheme,
        '#text': layoutTheme,
      },
    },
  ]

  if (manuscript.paywall) {
    subjects.push({
      '@authority': 'paywall',
      '@ID': 'paywall',
      'mods:topic': {
        '@authority': 'on',
        '#text': 'on',
      },
    })
  }

  return subjects
}

export const buildContainer = ({
  html,
  files,
  manuscript,
  modelMap,
  doType,
}: {
  html: string
  files: Map<string, string>
  manuscript: Manuscript
  modelMap: Map<string, Model>
  doType: string
}): string => {
  const { article, title } = extractContent(html, manuscript)

  const featuredImageData = buildFeaturedImageData(
    modelMap,
    manuscript.headerFigure
  )

  const featuredImageID = manuscript.headerFigure
    ? manuscript.headerFigure.replace(':', '_')
    : undefined

  const featuredImagePath = featuredImageID
    ? files.get(featuredImageID)
    : undefined

  // eslint-disable-next-line @typescript-eslint/ban-types
  const mods: { [key: string]: string | object | undefined } = {
    '@xmlns:mods': 'http://www.loc.gov/mods/v3',
    '@xsi:schemaLocation':
      'http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods.xsd',
    'mods:identifier': {
      '@type': 'doi',
      '#text': manuscript.DOI,
    },
    'mods:titleInfo': {
      '@ID': 'title',
      'mods:title': {
        '#text': title || '',
      },
    },
    'mods:name': findContributors(modelMap).map((contributor) => ({
      'mods:namePart': [
        {
          '@type': 'given',
          '#text': contributor.bibliographicName.given,
        },
        {
          '@type': 'family',
          '#text': contributor.bibliographicName.family,
        },
      ],
    })),
    'mods:abstract': manuscript.desc,
    'mods:subject': buildSubjects(manuscript),
    'mods:extension': {
      'atpn:do-extensions': {
        '@xmlns:atpn': 'http://www.atypon.com/digital-objects',
        '@xsi:schemaLocation':
          'http://www.atypon.com/digital-objects http://www.atypon.com/digital-objects/digital-objects.xsd',
        'atpn:featureImage': featuredImagePath,
        'atpn:featureImageCaption': featuredImageData.caption,
        'atpn:featuredImageCredit': featuredImageData.credit,
        'atpn:pubDate': buildPubDate(manuscript.publicationDate),
        'atpn:body': { '#cdata': article },
        'atpn:baseDoi': manuscript.DOI
          ? buildBaseDoi(manuscript.DOI)
          : undefined,
        'atpn:keywords': buildKeywords(modelMap),
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
        'mets:fileGrp': buildFileGroups(files, featuredImageID),
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
