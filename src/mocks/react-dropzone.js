// src/__mocks__/react-dropzone.js

// このファイルはreact-dropzoneライブラリのモックを提供します。
// Firebaseの使用に直接影響を与えるものではありませんが、
// テストやスタブ処理に使用されます。

export const useDropzone = () => ({
  getRootProps: () => ({}),
  getInputProps: () => ({}),
  isDragActive: false,
});

export default { useDropzone };