import { ContainedModel } from '@manuscripts/manuscript-transform'

export const createJSON = (data: ContainedModel[]): string =>
  JSON.stringify({ version: '2.0', data }, null, 2)
