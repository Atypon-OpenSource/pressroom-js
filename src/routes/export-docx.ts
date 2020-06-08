import { celebrate, Joi } from 'celebrate'
import { Router } from 'express'
import fs from 'fs-extra'

import { createArticle } from '../lib/create-article'
import { createDocx } from '../lib/create-docx'
import { createJATSXML } from '../lib/create-jats-xml'
import { jwtAuthentication } from '../lib/jwt-authentication'
import { logger } from '../lib/logger'
import { createTempDir, removeTempDir } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { upload } from '../lib/upload'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /export/docx:
 *   post:
 *     description: Convert manuscript data to DOCX
 *     produces:
 *       - application/vnd.openxmlformats-officedocument.wordprocessingml.document
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                file:
 *                  type: string
 *                  format: binary
 *                manuscriptID:
 *                  type: string
 *            encoding:
 *              file:
 *                contentType: application/zip
 *     responses:
 *       200:
 *         description: Conversion success
 */
export const exportDocx = Router().post(
  '/export/docx',
  jwtAuthentication('pressroom'),
  upload.single('file'),
  celebrate({
    body: {
      manuscriptID: Joi.string().required(),
    },
  }),
  wrapAsync(async (req, res) => {
    const { manuscriptID } = req.body as { manuscriptID: string }

    const dir = createTempDir()

    try {
      logger.debug(`Extracting ZIP archive to ${dir}`)
      await unzip(req.file.path, dir)

      // read the data
      const { data } = await fs.readJSON(dir + '/index.manuscript-json')
      const { article, modelMap } = createArticle(data, manuscriptID)

      // create XML
      await fs.writeFile(
        dir + '/manuscript.xml',
        createJATSXML(article, modelMap)
      )

      // TODO: move images
      // TODO: write CSL file from bundle

      // create DOCX
      await createDocx(dir, 'manuscript.xml', 'manuscript.docx')

      // send the file as an attachment
      res.download(dir + '/manuscript.docx')
    } finally {
      await removeTempDir(dir)
    }
  })
)
