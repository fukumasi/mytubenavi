// config/jest.config.js
module.exports = {
  testEnvironment: 'node',  // テスト環境を node に設定
  roots: ['<rootDir>/src'], // テスト対象のルートディレクトリを指定
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'], // 認識するファイル拡張子
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'], // テストファイルのマッチングパターン
  transform: {
    '^.+\\.jsx?$': 'babel-jest', // Babel で JSX ファイルを変換
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'], // テスト環境のセットアップファイル
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // CSS ファイルを無視
    '^@/(.*)$': '<rootDir>/src/$1', // エイリアス設定
  },
};
describe('EditProfile Component', () => {
  it('renders EditProfile component', () => {
    // テスト内容を記述します
  });
});
