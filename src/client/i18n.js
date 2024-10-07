import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import jaTranslations from './locales/ja.json';
import enTranslations from './locales/en.json';

const resources = {
  ja: {
    translation: jaTranslations,
  },
  en: {
    translation: enTranslations,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ja', // デフォルト言語を日本語に設定
    fallbackLng: 'en', // フォールバック言語を英語に設定
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false,
    },
    returnObjects: true, // オブジェクトの返却を有効化
  });

export default i18n;