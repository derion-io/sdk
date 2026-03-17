module.exports = {
  roots: ['<rootDir>'],
  testMatch: ['**/test/**.test.ts'],
  modulePathIgnorePatterns: [
    '<rootDir>/lib/ethers.js/packages/ethers',
    '<rootDir>/lib/ethers.js/packages/providers',
  ],
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
