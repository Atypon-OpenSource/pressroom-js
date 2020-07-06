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
import fuzz from 'fuzzball'

export const enrichMetadata = (grobidTEI: Document, JATS: Document): void => {
  const articleTitle = grobidTEI.querySelector('titleStmt > title')
  if (articleTitle && articleTitle.textContent) {
    mergeTitle(articleTitle, JATS)
  }

  const articleAbstract = grobidTEI.querySelector('profileDesc > abstract')
  if (articleAbstract && articleAbstract.textContent) {
    mergeAbstract(articleAbstract, JATS)
  }
  const author = grobidTEI.querySelectorAll('biblStruct > analytic > author')
  if (author) {
    mergeAuthors(author, JATS)
  }
}

const mergeTitle = (titleNode: Element, jats: Document) => {
  let titleGroup = jats.querySelector('article-meta > title-group')
  // if title-group dose not exists create one
  if (!titleGroup) {
    titleGroup = jats.createElement('title-group')
    const articleMeta = jats.querySelector('article-meta')
    if (articleMeta) {
      articleMeta.appendChild(titleGroup)
    }
  }
  // Remove the old title from front
  jats
    .querySelectorAll('title-group > article-title')
    .forEach((el) => el.remove())

  const parent = jats.querySelectorAll('title-group')
  const child = jats.createElement('article-title')
  child.innerHTML = titleNode.innerHTML

  parent.forEach((parent) => parent.appendChild(child))

  // Remove duplicate title from the body
  const body = jats.querySelector('body')
  if (body) {
    searchAndDelete(body, titleNode.innerHTML)
  }
}

const mergeAbstract = (enrichedAbstractNode: Element, jats: Document) => {
  let abstractNode = jats.querySelector('article-meta > abstract')
  if (!abstractNode) {
    abstractNode = jats.createElement('abstract')
    const articleMeta = jats.querySelector('article-meta')
    if (articleMeta) {
      articleMeta.appendChild(abstractNode)
    }
  }
  abstractNode.innerHTML = enrichedAbstractNode.innerHTML
  const body = jats.querySelector('body')
  if (body) {
    searchAndDelete(body, enrichedAbstractNode.innerHTML)
  }
}

const mergeAuthors = (authors: NodeListOf<Element>, jats: Document) => {
  let contribGroup = jats.querySelector('article-meta > contrib-group')
  // skip if there are contributors in the JATS
  if (
    contribGroup !== null &&
    contribGroup.textContent !== null &&
    contribGroup.textContent.trim().length !== 0
  ) {
    return
  }

  const selectFromNode = (authorNode: Element) => (selector: string) => {
    const node = authorNode.querySelector(selector)
    if (node !== null && node.textContent !== null) {
      return node.textContent
    }
    return null
  }

  if (contribGroup === null) {
    contribGroup = jats.createElement('contrib-group')
    const articleMeta = jats.querySelector('article-meta')
    if (articleMeta) {
      articleMeta.appendChild(contribGroup)
    }
  }

  authors.forEach((author) => {
    const select = selectFromNode(author)
    const firstName = select('persName > forename[type=first]')
    const middleName = select('persName > forename[type=middle]')
    let name = null
    if (firstName && middleName) {
      name = `${firstName} ${middleName}`
    } else if (firstName) {
      name = firstName
    }

    const contrib = {
      name: {
        surname: select('persName > surname'),
        'given-names': name,
      },
      role: 'author',
      email: select('email'),
      aff: {
        country: select(' affiliation > address > country'),
        institution: select('affiliation > orgName[type=institution]'),
        'addr-line': {
          'postal-code': select('affiliation > address > postCode'),
          city: select('affiliation > address > settlement'),
        },
        val: select('affiliation> address > addrLine'),
      },
    }
    // iterate reversely over keys and values to create a DOM element
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toDOM = (rootObj: any, rootElement: Element) => {
      if (typeof rootObj === 'string') {
        rootElement.appendChild(jats.createTextNode(rootObj))
        return
      }
      for (const prop in rootObj) {
        if (prop === 'val' && rootObj[prop] !== null) {
          rootElement.appendChild(jats.createTextNode(rootObj[prop]))
        } else if (rootObj[prop] !== null) {
          const child = jats.createElement(prop)
          toDOM(rootObj[prop], child)
          rootElement.appendChild(child)
        }
      }
    }
    const node = jats.createElement('contrib')
    toDOM(contrib, node)
    if (contribGroup !== null) {
      contribGroup.appendChild(node)
    }
  })
}
const searchAndDelete = (root: Element, targetHTML: string, threshold = 95) => {
  const serializedRoot = new XMLSerializer().serializeToString(root)
  const processedRoot = fuzz.full_process(serializedRoot)
  const numberOfOcc = (subStr: string) =>
    (processedRoot.match(new RegExp(subStr, 'gi')) || []).length

  const safeToRemove = (nodeHTML: string) => {
    const similarity = fuzz.ratio(nodeHTML, targetHTML)
    return (
      similarity >= threshold ||
      (fuzz.partial_ratio(nodeHTML, targetHTML) >= threshold &&
        numberOfOcc(nodeHTML) === 1)
    )
  }
  // Breadth first search
  const queue = [root]
  while (queue.length !== 0) {
    const node = queue.shift()
    if (node) {
      const nodeHTML = node.innerHTML
      if (safeToRemove(nodeHTML)) {
        node.remove()
      }
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children.item(i)
        if (child) {
          queue.push(child)
        }
      }
    }
  }
}
