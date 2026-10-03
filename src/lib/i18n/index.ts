import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zhTW from "./locales/zh-TW.json";

const savedLocale = localStorage.getItem("tetris.locale");
const initialLocale = savedLocale === "zh-TW" ? "zh-TW" : "en";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-TW": { translation: zhTW },
  },
  lng: initialLocale,
  fallbackLng: "en",
  supportedLngs: ["en", "zh-TW"],
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (language) => {
  localStorage.setItem("tetris.locale", language === "zh-TW" ? "zh-TW" : "en");
  document.documentElement.lang = language === "zh-TW" ? "zh-Hant" : "en";
});

export default i18n;
