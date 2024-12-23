module.exports = {
  roots: ['<rootDir>'],
  testMatch: ['**/test/**.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest', {
        diagnostics: false,
      },
    ],
  },
  verbose: true,
  testTimeout: 60000,
}
