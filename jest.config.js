module.exports = {
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  setupFiles: ['dotenv/config'],
  testEnvironment: 'jest-environment-jsdom-sixteen',
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  verbose: true,
}
