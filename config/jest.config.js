const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '..'),
  testEnvironment: "jsdom",
  moduleDirectories: ["node_modules", "src"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^react-dropzone$": "<rootDir>/src/__mocks__/react-dropzone.js",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^src/(.*)$": "<rootDir>/src/$1", // 追加: srcディレクトリのエイリアス設定
  },
  testMatch: [
    "<rootDir>/tests/**/*.test.js",
    "<rootDir>/src/**/*.test.js"
  ],
  moduleFileExtensions: ["js", "jsx", "json", "node"],
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest"
  },
  coverageDirectory: "<rootDir>/coverage",
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/**/*.test.{js,jsx}",
    "!src/index.js",
    "!src/setupTests.js"
  ],
  globals: {
    'process.env.NODE_ENV': 'test'
  },
  testPathIgnorePatterns: ["/node_modules/", "/build/"],
  verbose: true,
  maxWorkers: 1
};
