// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer')

export const upload = multer({ dest: '/tmp/uploads' })
