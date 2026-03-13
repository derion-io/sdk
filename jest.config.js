module.exports = {
  roots: ['<rootDir>'],
  testMatch: ['**/test/**.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/lib/ethers.js/packages/ethers'],
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
