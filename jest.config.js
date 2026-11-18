const pkg = require('./package.json');

module.exports = {
  preset: 'ts-jest',
  globals: { __PLASMOFAST_VERSION__: pkg.version },
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node',
      },
    }],
  },
};
