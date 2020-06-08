import {
  ContainedModel,
  isFigure,
  parseJATSArticle,
} from '@manuscripts/manuscript-transform'
import archiver from 'archiver'
import { Router } from 'express'
import fs from 'fs-extra'

import { convertFileToJATS } from '../lib/convert-file-to-jats'
import { createJSON } from '../lib/create-json'
import { jwtAuthentication } from '../lib/jwt-authentication'
import { logger } from '../lib/logger'
import { parseXMLFile } from '../lib/parse-xml-file'
import { sendArchive } from '../lib/send-archive'
import { createTempDir, removeTempDir } from '../lib/temp-dir'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /import/word:
 *   post:
 *     description: Convert Word file to Manuscripts data with pandoc
 *     produces:
 *       - application/zip
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *        description: multipart form data including Word file
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                file:
 *                  type: string
 *                  format: binary
 *     responses:
 *       200:
 *         description: Conversion success
 */
export const importWord = Router().post(
  '/import/word',
  jwtAuthentication('pressroom'),
  upload.single('file'),
  wrapAsync(async (req, res) => {
    logger.debug(`Received ${req.file.originalname}`)

    const dir = createTempDir()

    try {
      const archive = archiver.create('zip')

      // convert the Word file to JATS XML via pandoc
      logger.debug('Converting Word file to JATS XML via pandoc')
      await convertFileToJATS({
        dir,
        from: 'docx',
        inputPath: req.file.path,
        outputPath: 'manuscript.xml',
      })

      // parse the JATS XML
      const doc = await parseXMLFile(dir + '/manuscript.xml')

      // convert the JATS XML to Manuscripts data
      const manuscriptModels = parseJATSArticle(doc) as ContainedModel[]

      // output JSON
      archive.append(createJSON(manuscriptModels), {
        name: 'index.manuscript-json',
      })

      for (const model of manuscriptModels) {
        if (isFigure(model)) {
          if (model.originalURL) {
            const name = model._id.replace(':', '_')

            logger.debug(`Adding ${model.originalURL} as Data/${name}`)

            archive.append(fs.createReadStream(`${dir}/${model.originalURL}`), {
              name,
              prefix: 'Data/',
            })
          }
        }
      }

      await archive.finalize()

      await sendArchive(res, archive, 'manuscript.manuproj')
    } finally {
      await removeTempDir(dir)
    }
  })
)
