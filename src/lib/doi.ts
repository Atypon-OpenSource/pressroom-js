const VALID_DOI_REGEX = /^10\..+\/.+/

export const isValidDOI = (doi: string): boolean => VALID_DOI_REGEX.test(doi)
