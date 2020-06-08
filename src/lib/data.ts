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
export const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

export const processElements = (
  doc: Document,
  selector: string,
  callback: (element: Element) => void
): void => {
  const nodes = doc.evaluate(
    selector,
    doc,
    doc.createNSResolver(doc),
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
  )

  for (let i = 0; i < nodes.snapshotLength; i++) {
    callback(nodes.snapshotItem(i) as Element)
  }
}

// export const copyHTMLDataFiles = async (
//   html: string,
//   dir: string,
//   archive: Archiver,
//   outputPrefix = 'Data/'
// ): Promise<Map<string, string>> => {
//   const parser = new DOMParser()
//   const doc = parser.parseFromString(html, 'text/html')
//
//   const nodes = doc.querySelectorAll<HTMLImageElement>('img[src]') // TODO: other attachments?
//
//   const files: Map<string, string> = new Map()
//
//   for (const node of nodes) {
//     const path = node.getAttribute('src')
//
//     if (path) {
//       const parts = parse(path)
//
//       archive.append(fs.createReadStream(`${dir}/Data/${parts.name}`), {
//         name: parts.base,
//         prefix: outputPrefix,
//       })
//
//       files.set(parts.name, path)
//     }
//   }
//
//   return files
// }
