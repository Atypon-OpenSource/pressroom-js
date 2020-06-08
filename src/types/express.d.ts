// eslint-disable-next-line import/no-unresolved,@typescript-eslint/no-unused-vars
import Express from 'express'

declare module 'express-serve-static-core' {
  import { ExtylesArcAuthentication } from '../lib/extyles-arc'

  interface Request {
    user: {
      containerID: string
      audience: string
      arc?: ExtylesArcAuthentication
    }
  }
}
