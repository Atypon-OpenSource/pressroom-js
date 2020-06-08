import archiver from 'archiver'
import { celebrate, Joi } from 'celebrate'
import express from 'express'
import fs from 'fs-extra'

import { apiKeyAuthentication } from '../lib/api-key-authentication'
import { config } from '../lib/config'
import { convertWordToJATS } from '../lib/extyles-arc'
import { fetchAttachment } from '../lib/fetch-literatum-attachment'
import { convertJATSToWileyML } from '../lib/gaia'
import { logger } from '../lib/logger'
import { sendArchive } from '../lib/send-archive'
import { createTempDir, removeTempDir } from '../lib/temp-dir'
import { unzip } from '../lib/unzip'
import { wrapAsync } from '../lib/wrap-async'

/**
 * @swagger
 *
 * /submission:
 *   post:
 *     description: Fetch and convert submission to WileyML Gateway bundle
 *     produces:
 *       - application/zip
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *        description: Submission description in JSON
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                depositoryCode:
 *                  type: string
 *                attachments:
 *                  type: array
 *                  items:
 *                    type: object
 *                metadata:
 *                  type: object
 *     responses:
 *       200:
 *         description: Conversion success
 */
export const buildSubmissionBundle = express.Router().post(
  '/submission', // TODO
  apiKeyAuthentication,
  express.json(),
  celebrate({
    body: {
      depositoryCode: Joi.string().required(),
      attachments: Joi.array()
        .items(
          Joi.object({
            designation: Joi.string().required(),
            format: Joi.string().required(),
            name: Joi.string().required(),
            url: Joi.string().required(),
          })
        )
        .required(),
      metadata: Joi.object({
        digitalISSN: Joi.string().required(),
        doi: Joi.string().required(),
      }).required(),
    },
  }),
  wrapAsync(async (req, res) => {
    const { depositoryCode, attachments, metadata } = req.body as {
      depositoryCode: string
      attachments: Array<{
        designation: string
        format: string
        name: string
        url: string
      }>
      metadata: {
        digitalISSN: string
        doi: string
      }
    }

    const dir = createTempDir()

    try {
      const issn = metadata.digitalISSN.toUpperCase().replace(/[^0-9X]/, '')
      const [, articleID] = metadata.doi.toUpperCase().split('/', 2)
      const prefix = `${issn}/9999/9999/999A/${articleID}`

      // fetch the files
      // TODO: receive these as a ZIP file instead?
      for (const attachment of attachments) {
        await fetchAttachment(attachment, dir)
      }

      const mainDocuments = attachments.filter(
        (attachment) => attachment.designation === 'Main Document'
      )

      // prepare the output ZIP
      const archive = archiver.create('zip')

      switch (depositoryCode) {
        case 'S1': {
          const attachment = mainDocuments.find((attachment) =>
            ['doc', 'docx'].includes(attachment.format)
          )

          if (!attachment) {
            throw new Error('Expected doc or docx attachment')
          }

          const buffer = await fs.readFile(`${dir}/${attachment.name}`)

          logger.debug(`Converting Word file to JATS XML via Arc`)
          const zip = await convertWordToJATS(buffer, config.arc)

          logger.debug(`Extracting ZIP archive to ${dir}`)
          await unzip(zip, dir)

          const jats = await fs.readFile(dir + '/manuscript.XML', 'UTF-8')

          logger.debug(`Converting JATS XML to WileyML`)
          const wileyml = await convertJATSToWileyML(jats)

          archive.append(wileyml, {
            name: `${articleID}.xml`,
            prefix,
          })

          await archive.finalize()

          await sendArchive(res, archive)

          break
        }

        // case 'Authorea': {
        //   const attachment = mainDocuments.find((attachment) =>
        //     ['xml'].includes(attachment.format)
        //   )
        //
        //   if (!attachment) {
        //     throw new Error('Expected xml attachment')
        //   }
        //
        //   break
        // }

        default:
          throw new Error(`Unsupported depositoryCode: ${depositoryCode}`)
      }
    } finally {
      await removeTempDir(dir)
    }
  })
)
