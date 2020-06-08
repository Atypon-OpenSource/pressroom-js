import { JSDOM } from 'jsdom'

export const defineGlobals = (): void => {
  const { window } = new JSDOM()

  Object.defineProperties(global, {
    window: {
      value: window,
    },
    document: {
      value: window.document,
    },
    DOMParser: {
      value: window.DOMParser,
    },
    Element: {
      value: window.Element,
    },
    XMLSerializer: {
      value: window.XMLSerializer,
    },
    XPathResult: {
      value: window.XPathResult,
    },
  })
}
