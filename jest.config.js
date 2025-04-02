/** @returns {Promise<import('jest').Config>} */
export default async () => {
  return {
    verbose: true,
    testEnvironment: 'jsdom',
    transform: {
      '^.+\\.jsx?$': 'esbuild-jest',
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
      '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      '\\.(jpg|jpeg|png|gif|ico)$': '<rootDir>/mocks/fileMock.js',
    },
    transformIgnorePatterns: ['/node_modules/(?!uuid)/'],
    resolver: undefined,
  };
};
