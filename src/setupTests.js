import 'fast-text-encoding';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Firebase モックの設定
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
}));

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

beforeEach(() => {
  jest.clearAllMocks(); // すべてのモック関数をクリア
});

jest.setTimeout(30000); // 30秒に設定

// Firebase Emulator の設定（オプション）
// もし Firebase Emulator を使用する場合は、以下のコメントを解除してください
/*
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

beforeAll(() => {
  const db = getFirestore();
  connectFirestoreEmulator(db, 'localhost', 8080);

  const auth = getAuth();
  connectAuthEmulator(auth, 'http://localhost:9099');
});
*/