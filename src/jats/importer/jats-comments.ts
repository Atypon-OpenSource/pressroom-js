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

import { CommentAnnotation, Keyword, Model } from '@manuscripts/json-schema'
import {
  buildComment,
  buildContribution,
  highlightableFields,
  HighlightableModel,
  isHighlightableModel,
  isKeyword,
} from '@manuscripts/transform'
import { v4 as uuidv4 } from 'uuid'

import { References } from './jats-references'

export type JATSComment = {
  id: string
  text: string
}

export type JATSCommentMark = {
  token: string
  comment: JATSComment
}

const DEFAULT_PROFILE_ID =
  'MPUserProfile:0000000000000000000000000000000000000001'

export const isJATSComment = (node: Node) => {
  return (
    node.nodeType === node.PROCESSING_INSTRUCTION_NODE &&
    node.nodeName === 'AuthorQuery'
  )
}

export const parseJATSComment = (node: Node): JATSComment | undefined => {
  const text = node.textContent
  if (text) {
    const id = /id="(.+)"/.exec(text)
    const queryText = /queryText="(.+)"/.exec(text)
    if (id && queryText) {
      return {
        id: id[1],
        text: queryText[1],
      }
    }
  }
}

/**
 * Replaces processing instructions with tokens
 */
export const markComments = (doc: Document): JATSCommentMark[] => {
  const marks: JATSCommentMark[] = []
  const root = doc.getRootNode()
  const queue: Node[] = [root]
  while (queue.length !== 0) {
    const node = queue.shift()
    if (node) {
      if (isJATSComment(node)) {
        const comment = parseJATSComment(node)
        if (comment) {
          const token = addMark(doc, node)
          if (token) {
            const mark = {
              token,
              comment,
            }
            marks.push(mark)
          }
        }
      }
      node.childNodes.forEach((child) => {
        queue.push(child)
      })
    }
  }
  return marks
}

const addMark = (doc: Document, node: Node) => {
  const parent = node.parentElement
  if (parent) {
    const token = uuidv4()
    const tokenNode = doc.createTextNode(token)
    parent.insertBefore(tokenNode, node)
    return token
  }
}

export const createComments = (
  models: Model[],
  marks: JATSCommentMark[]
): CommentAnnotation[] => {
  const comments = []
  for (const model of models) {
    if (isHighlightableModel(model)) {
      comments.push(...processModel(model, marks))
    } else if (isKeyword(model)) {
      comments.push(...processKeyword(model, marks))
    }
  }
  return comments
}

const getFieldMarks = (content: string, marks: JATSCommentMark[]) => {
  return marks
    .filter((m) => content.indexOf(m.token) >= 0)
    .sort((a, b) => content.indexOf(a.token) - content.indexOf(b.token))
}

const processModel = (model: HighlightableModel, marks: JATSCommentMark[]) => {
  const comments = []
  for (const field of highlightableFields) {
    const content = model[field]
    if (!content) {
      continue
    }
    const results = processContent(
      model,
      content,
      getFieldMarks(content, marks)
    )
    model[field] = results.content
    comments.push(...results.comments)
  }
  return comments
}

const processKeyword = (
  model: Keyword,
  marks: JATSCommentMark[]
): CommentAnnotation[] => {
  const comments = []
  const name = model.name
  let content = name
  for (const mark of getFieldMarks(name, marks)) {
    content = name.replace(mark.token, '')
    const target = model.containedGroup
    if (!target) {
      continue
    }
    const contributions = [buildContribution(DEFAULT_PROFILE_ID)]

    const comment = buildComment(
      target,
      mark.comment.text,
      undefined,
      contributions
    ) as CommentAnnotation
    model.name = content
    comments.push(comment)
  }
  return comments
}

/**
 * Creates CommentAnnotations from marked processing instructions in model
 */
const processContent = (
  model: HighlightableModel,
  content: string,
  marks: JATSCommentMark[]
) => {
  const comments = []

  let result = content
  for (const mark of marks) {
    const token = mark.token
    const index = result.indexOf(token)

    // Remove the token
    result = result.replace(token, '')

    const contributions = [buildContribution(DEFAULT_PROFILE_ID)]
    const selector = {
      from: index,
      to: index,
    }
    const comment = buildComment(
      model._id,
      mark.comment.text,
      selector,
      contributions
    ) as CommentAnnotation
    comments.push(comment)
  }
  return {
    content: result,
    comments,
  }
}

export const createReferenceComments = (references: References) => {
  const comments: CommentAnnotation[] = []
  for (const item of references.getBibliographyItems()) {
    const id = item._id
    for (const comment of references.getComments(id)) {
      const contributions = [buildContribution(DEFAULT_PROFILE_ID)]
      const c = buildComment(
        id,
        comment.text,
        undefined,
        contributions
      ) as CommentAnnotation
      comments.push(c)
    }
  }
  return comments
}
