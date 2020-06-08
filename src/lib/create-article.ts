import {
  ContainedModel,
  Decoder,
  ManuscriptNode,
} from '@manuscripts/manuscript-transform'

export const createArticle = (
  data: ContainedModel[],
  manuscriptID: string
): {
  article: ManuscriptNode
  decoder: Decoder
  modelMap: Map<string, ContainedModel>
  manuscriptModels: ContainedModel[]
} => {
  const manuscriptModels = data.filter(
    // @ts-ignore
    (model) => !model.manuscriptID || model.manuscriptID === manuscriptID
  )

  const modelMap = new Map<string, ContainedModel>(
    manuscriptModels.map((model) => [model._id, model])
  )

  const decoder = new Decoder(modelMap)

  const article = decoder.createArticleNode(manuscriptID)

  return { article, decoder, modelMap, manuscriptModels }
}
