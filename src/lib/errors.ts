/*!
 * © 2020 Atypon Systems LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** An error-like object that has a code. Used amongst error types to describe those error types that have their own natural HTTP status code. */
export interface StatusCoded {
  readonly statusCode: number
  readonly name: string
  readonly message: string
  readonly internalErrorCode: InternalErrorCode
}

export function isStatusCoded(err: Error): err is StatusCoded {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  const statusCode = (err as any).statusCode
  if (typeof statusCode !== 'number') {
    return false
  }

  // we could be stricter, but let's assume
  // 4xx and 5xx are HTTP status code -like enough.
  return statusCode >= 400 && statusCode <= 599
}

export class HTMLPreviewError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.HTMLPreviewError
  readonly statusCode = 500
  constructor(message: string) {
    super(message)
    this.name = 'HTMLPreviewError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class PDFPreviewError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.PDFPreviewError
  readonly statusCode = 500
  constructor(message: string) {
    super(message)
    this.name = 'PDFPreviewError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

enum InternalErrorCode {
  HTMLPreviewError = 'PREVIEW_HTML_GENERATION_FAILED',
  PDFPreviewError = 'PREVIEW_PDF_GENERATION_FAILED',
}
