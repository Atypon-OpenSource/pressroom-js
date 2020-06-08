import rimraf from 'rimraf'
import { promisify } from 'util'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const tempy = require('tempy')

export const createTempDir = tempy.directory

export const removeTempDir = promisify(rimraf)
