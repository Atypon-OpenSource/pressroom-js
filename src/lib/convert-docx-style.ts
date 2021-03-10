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
import {
  ContainedModel,
  hasObjectType,
} from '@manuscripts/manuscript-transform'
import {
  Color,
  ObjectTypes,
  ParagraphStyle,
} from '@manuscripts/manuscripts-json-schema'
import { TextStyling } from '@manuscripts/manuscripts-json-schema/dist/types/types'

import { logger } from './logger'

export const convertDocxStyle = (
  styleML: Document,
  manuscriptData: Array<ContainedModel>
): Document => {
  const headingStyles = manuscriptData.filter(
    (model) =>
      model.prototype && model.prototype.match('MPParagraphStyle:H[1-9]')
  ) as Array<ParagraphStyle>

  const bodyTextStyle = manuscriptData.filter(
    (model) =>
      model.prototype && model.prototype.match('MPParagraphStyle:bodyText')
  ) as Array<ParagraphStyle>
  const colors = manuscriptData
    .filter<Color>(hasObjectType(ObjectTypes.Color))
    .map((model) => [model._id, model.value])
  const colorsMap = new Map<string, string>()
  if (!colors) {
    logger.error('Colors not found in the manuscript data')
  }
  colors.forEach((color) => {
    if (color[0] && color[1]) {
      colorsMap.set(color[0], color[1])
    }
  })
  // default color
  colorsMap.set('MPColor:black', '#000000')
  addHeadingStyle(styleML, headingStyles, colorsMap)

  if (bodyTextStyle.length > 0) {
    const bodyText = bodyTextStyle[0]
    addBodyTextStyle(styleML, bodyText, colorsMap)
  } else {
    logger.error('BodyText style not found in the manuscript')
  }
  return styleML
}

export const addBodyTextStyle = (
  styleML: Document,
  bodyTextStyle: ParagraphStyle,
  colorsMap: Map<string, string>
): void =>
  ['BodyText', 'Abstract'].forEach((styleID) => {
    if (bodyTextStyle.textStyling) {
      addTextStyling(styleML, bodyTextStyle.textStyling, styleID, colorsMap)
    }
    addSpacingAndAlignment(styleML, bodyTextStyle, styleID)
  })

export const addHeadingStyle = (
  styleML: Document,
  styles: Array<ParagraphStyle>,
  colorsMap: Map<string, string>
): void => {
  for (const style of styles) {
    const styleID = stylesIDs.get(style.preferredXHTMLElement)
    if (!styleID) {
      logger.error(`${style.preferredXHTMLElement} not found`)
      continue
    }
    if (style.textStyling) {
      addTextStyling(styleML, style.textStyling, styleID, colorsMap)
    }
    addSpacingAndAlignment(styleML, style, styleID)
  }
}

const buildStyleIDs = () => {
  const map = new Map<string, string>()
  for (let i = 1; i <= 6; i++) {
    map.set('h' + i, 'Heading' + i)
  }
  return map
}

const stylesIDs = buildStyleIDs()

const addTextStyling = (
  styleML: Document,
  textStyling: TextStyling,
  styleID: string,
  colorsMap: Map<string, string>
): void => {
  const root = styleML.createElement('w:rPr')
  const { bold, fontSize, italic, fontFamily, color } = textStyling
  if (bold) {
    const bold = styleML.createElement('w:b')
    root.appendChild(bold)
  }

  if (fontSize) {
    const buildFontProperty = (tag: string) => {
      const size = styleML.createElement(tag)
      size.setAttribute('w:val', (2 * fontSize).toString())
      root.appendChild(size)
    }
    buildFontProperty('w:szCs')
    buildFontProperty('w:sz')
  }

  if (italic) {
    const italic = styleML.createElement('w:i')
    root.appendChild(italic)
  }

  if (fontFamily) {
    const font = styleML.createElement('w:rFonts')
    font.setAttribute('w:ascii', fontFamily)
    font.setAttribute('w:cs', fontFamily)
    font.setAttribute('w:eastAsia', fontFamily)
    font.setAttribute('w:hAnsi', fontFamily)
    root.appendChild(font)
  }

  if (color && colorsMap.has(color)) {
    const colorValue = colorsMap.get(color) as string
    const colorNode = styleML.createElement('w:color')
    colorNode.setAttribute('w:val', colorValue.replace('#', ''))
    root.appendChild(colorNode)
  } else if (color && !colorsMap.has(color)) {
    logger.error(`Cannot find value for ${color}`)
  }

  const style = styleML.querySelector(`w\\:style[w\\:styleId="${styleID}"]`)
  if (style) {
    style.querySelectorAll('w\\:rPr').forEach((child) => child.remove())
    style.append(root)
  } else {
    logger.error(`Cannot find ${styleID}`)
  }
}

const addSpacingAndAlignment = (
  styleML: Document,
  paragraphStyle: ParagraphStyle,
  styleID: string
): void => {
  const root = styleML.createElement('w:pPr')
  addAlignmentToRoot(styleML, root, paragraphStyle.alignment)
  addSpacingToRoot(styleML, root, paragraphStyle)
  const style = styleML.querySelector(`w\\:style[w\\:styleId="${styleID}"]`)
  if (style) {
    style.querySelectorAll('w\\:pPr').forEach((child) => child.remove())
    style.append(root)
  } else {
    logger.error(`Cannot find ${styleID}`)
  }
}

const addAlignmentToRoot = (
  styleML: Document,
  root: Element,
  alignment: string
): void => {
  const alignmentNode = styleML.createElement('w:jc')
  let alignmentValue = 'left'
  if (['center', 'left', 'right', 'end', 'start'].includes(alignment)) {
    alignmentValue = alignment
  }
  alignmentNode.setAttribute('w:val', alignmentValue)
  root.appendChild(alignmentNode)
}

const addSpacingToRoot = (
  styleML: Document,
  root: Element,
  style: ParagraphStyle
): void => {
  // 1pt equal 20 unit
  const findNetSpace = (num: number) => (num * 20).toString()
  const spacingNode = styleML.createElement('w:spacing')
  spacingNode.setAttribute('w:before', findNetSpace(style.topSpacing))
  if (style.bottomSpacing) {
    spacingNode.setAttribute('w:after', findNetSpace(style.bottomSpacing))
  }
  if (style.textStyling && style.textStyling.fontSize) {
    spacingNode.setAttribute(
      'w:line',
      findNetSpace(style.lineSpacing * style.textStyling.fontSize)
    )
  } else {
    logger.error('Cannot find fontSize')
  }
  root.appendChild(spacingNode)
}
