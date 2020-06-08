import {
  ActualManuscriptNode,
  ContainedModel,
  JATSExporter,
  JATSExporterOptions,
} from '@manuscripts/manuscript-transform'

export const createJATSXML = (
  article: ActualManuscriptNode,
  modelMap: Map<string, ContainedModel>,
  options: JATSExporterOptions = {}
): string => new JATSExporter().serializeToJATS(article, modelMap, options)
