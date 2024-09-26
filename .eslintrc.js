module.exports = {
  "env": {
    "browser": true,
    "es2021": true,
    "node": true,
    "jest": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended"
  ],
  "parser": "@babel/eslint-parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": 12,
    "sourceType": "module",
    "requireConfigFile": false,
    "babelOptions": {
      "presets": ["@babel/preset-react"]
    }
  },
  "plugins": [
    "react"
  ],
  "rules": {
    "react/prop-types": "off",
    "no-unused-vars": "warn",
    "no-console": "warn",
    "react/react-in-jsx-scope": "off",
    "react/display-name": "off",
    "react/jsx-key": "error"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "overrides": [
    {
      "files": ["*.js", "*.jsx"],
      "rules": {
        "no-undef": "error"
      }
    },
    {
      "files": ["src/firebase/*.js"], // Firebaseの設定ファイル
      "rules": {
        "no-unused-vars": "off" // Firebase設定では未使用の変数を許可
      }
    }
  ],
  "ignorePatterns": ["node_modules/", "build/", "dist/", "*.config.js", ".firebase/"]
};