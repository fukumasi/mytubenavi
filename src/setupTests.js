import 'fast-text-encoding';
import '@testing-library/jest-dom';
import mongoose from 'mongoose';
import { TextEncoder, TextDecoder } from 'util';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config({ path: '.env.test' });

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

let mongod;

beforeAll(async () => {
  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    if (mongoose.connection.readyState === 0) { // 接続がない場合のみ接続する
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to the in-memory database');
    }
  } catch (error) {
    console.error('Error connecting to the in-memory database:', error);
  }
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
      await mongod.stop();
      console.log('Closed the database connection and stopped the in-memory database');
    }
  } catch (error) {
    console.error('Error closing the database connection:', error);
  }
});

beforeEach(() => {
  jest.clearAllMocks(); // すべてのモック関数をクリア
});

jest.setTimeout(30000); // 30秒に設定
