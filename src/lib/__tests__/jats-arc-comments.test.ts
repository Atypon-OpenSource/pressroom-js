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
  ContainedModel,
  HighlightableModel,
  isHighlightableModel,
  parseJATSArticle,
} from '@manuscripts/manuscript-transform'
import fs from 'fs-extra'
import randomstring from 'randomstring'

import { defineGlobals } from '../define-globals'
import {
  markCommentsWithTokens,
  replaceTokensWithHighlights,
} from '../jats-arc-comments'
import { parseXMLFile } from '../parse-xml-file'

defineGlobals()
describe('eXtyles JATS comments', () => {
  const mockInputFile =
    __dirname + '/../__mocks__/__fixtures__/index.manuscript-json'
  test('Comments highlight with random positions', async () => {
    const { data }: { data: Array<ContainedModel> } = fs.readJSONSync(
      mockInputFile
    )
    const map = new Map<string, string>()
    const changeContent = (content: string) => {
      const position = Math.floor(Math.random() * (content.length + 1))
      const token = randomstring.generate(7)
      map.set(token, 'test')
      return content.substr(0, position) + token + content.substr(position)
    }
    const modelMap = new Map(data.map((model) => [model._id, model]))
    const markedData = data.slice(0)
    for (const model of markedData) {
      if (isHighlightableModel(model)) {
        const { contents, title, caption } = model
        if (contents) {
          model.contents = changeContent(contents)
        }
        if (title) {
          model.title = changeContent(title)
        }
        if (caption) {
          model.caption = changeContent(caption)
        }
      }
    }

    replaceTokensWithHighlights(map, markedData)

    for (const model of markedData) {
      if (isHighlightableModel(model)) {
        const { contents, title, caption, _id } = model
        const originalModel = modelMap.get(_id)
        if (originalModel && isHighlightableModel(originalModel)) {
          const {
            contents: originalContent,
            title: originalTitle,
            caption: originalCaption,
          } = originalModel as HighlightableModel
          expect(contents).toStrictEqual(originalContent)
          expect(title).toStrictEqual(originalTitle)
          expect(caption).toStrictEqual(originalCaption)
        }
      }
    }
  })
  const jatsArcInput =
    __dirname + '/../__mocks__/__fixtures__/manuscript-jats-arc.xml'
  test('Comments highlight against snapshot', async () => {
    const doc = await parseXMLFile(jatsArcInput)
    const authorQueriesMap = markCommentsWithTokens(doc)
    const manuscriptModels = parseJATSArticle(doc) as ContainedModel[]
    replaceTokensWithHighlights(authorQueriesMap, manuscriptModels)
    const removeTags = (content: string) => {
      const node = new DOMParser().parseFromString(
        `<div>${content}</div>`,
        'application/xml'
      ).firstChild
      if (node) {
        return node.textContent
      }
    }
    manuscriptModels.forEach((model) => {
      if (isHighlightableModel(model)) {
        const { contents, title, caption } = model
        if (contents) {
          expect(removeTags(contents)).toMatchSnapshot()
        }
        if (title) {
          expect(removeTags(title)).toMatchSnapshot()
        }
        if (caption) {
          expect(removeTags(caption)).toMatchSnapshot()
        }
      }
    })
  })
})
