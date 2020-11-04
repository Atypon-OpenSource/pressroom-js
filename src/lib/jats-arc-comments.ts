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
import {
  Build,
  buildComment,
  buildHighlight,
  buildHighlightMarker,
  ContainedModel,
  HighlightableField,
  isHighlightableModel,
} from '@manuscripts/manuscript-transform'
import { HighlightMarker } from '@manuscripts/manuscripts-json-schema'
import randomstring from 'randomstring'

import { logger } from './logger'

const createHighlightMarkers = (
  highlightID: string,
  offset: number,
  field: HighlightableField
): Array<HighlightMarker> => {
  const startMarker = buildHighlightMarker(
    highlightID,
    true,
    offset,
    field
  ) as HighlightMarker
  const endMarker = buildHighlightMarker(
    highlightID,
    false,
    offset,
    field
  ) as HighlightMarker
  return [startMarker, endMarker]
}

export const replaceTokensWithHighlights = (
  authorQueriesMap: Map<string, string>,
  manuscriptModels: Array<ContainedModel>
): void => {
  const tokens = [...authorQueriesMap.keys()]
  const createdModels: Build<ContainedModel>[] = []
  for (const model of manuscriptModels) {
    if (isHighlightableModel(model)) {
      // Search for tokens on every HighlightableField
      for (const field of ['contents', 'caption', 'title']) {
        const highlightableField = field as HighlightableField
        const content = model[highlightableField]
        if (!content) {
          continue
        }
        // Tokens needs to be removed in the order they appears in the text to keep a valid index of the highlight
        const sortedTokens = tokens
          .filter((token) => content.indexOf(token) >= 0)
          .sort((a, b) => content.indexOf(a) - content.indexOf(b))

        let contentWithoutTokens = content
        for (const token of sortedTokens) {
          const startTokenIndex = contentWithoutTokens.indexOf(token)
          const query = authorQueriesMap.get(token)
          if (query) {
            // Remove the token
            contentWithoutTokens = contentWithoutTokens.replace(token, '')
            // Add the comment
            const comment = `<div><p>${query}</p></div>`
            const highlight = buildHighlight()
            const commentAnnotation = buildComment(highlight._id, comment)
            createdModels.push(highlight)
            createdModels.push(commentAnnotation)
            // Highlight comment location
            model.highlightMarkers = createHighlightMarkers(
              highlight._id,
              startTokenIndex,
              highlightableField
            )
          }
        }
        // Add the content after removing the tokens
        model[highlightableField] = contentWithoutTokens
      }
    }
  }
  createdModels.forEach((model) => {
    // Better types?
    manuscriptModels.push(model as ContainedModel)
  })
}

/**
 * Add tokens to the places where the comments appear
 * @param doc
 * @return authorQueriesMap token => text query
 */
export const markCommentsWithTokens = (doc: Document): Map<string, string> => {
  const authorQueriesMap = new Map<string, string>()
  const root = doc.getRootNode()
  const queue: Array<Node> = [root]
  while (queue.length !== 0) {
    const node = queue.shift()
    if (node) {
      const { nodeType, nodeName } = node
      if (
        nodeType === node.PROCESSING_INSTRUCTION_NODE &&
        nodeName === 'AuthorQuery'
      ) {
        const token = randomstring.generate(7)
        // Node inserted to parent no need to shift
        insertToken(doc, node, authorQueriesMap, token)
      }
      node.childNodes.forEach((child) => {
        queue.push(child)
      })
    }
  }
  return authorQueriesMap
}

const insertToken = (
  doc: Document,
  processingInstructionNode: Node,
  authorQueriesMap: Map<string, string>,
  token: string
) => {
  const { textContent } = processingInstructionNode
  if (textContent) {
    const instruction = parseProcessingInstruction(textContent)
    const { parentElement } = processingInstructionNode
    if (parentElement && instruction) {
      const { queryText } = instruction
      const tokenNode = doc.createTextNode(token)
      authorQueriesMap.set(token, queryText)
      return parentElement.insertBefore(tokenNode, processingInstructionNode)
    } else {
      logger.error(`Processing instruction node "${textContent}" skipped`)
    }
  }
}

type ProcessingInstruction = { id: string; queryText: string }
export const parseProcessingInstruction = (
  str: string
): ProcessingInstruction | undefined => {
  const value = `<AuthorQuery ${str} />`
  const processingInstruction = new DOMParser().parseFromString(
    value,
    'application/xml'
  ).firstElementChild
  if (processingInstruction) {
    const queryText = processingInstruction.getAttribute('queryText')
    const id = processingInstruction.getAttribute('id')
    if (queryText && id) {
      return { queryText, id }
    }
  }
}
