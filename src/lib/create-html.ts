import {
  ActualManuscriptNode,
  ContainedModel,
  HTMLTransformer,
} from '@manuscripts/manuscript-transform'

export const createHTML = (
  article: ActualManuscriptNode,
  modelMap: Map<string, ContainedModel>
): string => new HTMLTransformer().serializeToHTML(article, modelMap)
