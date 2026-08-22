import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import "dayjs/locale/ro";
import en from "./en.json";
import ro from "./ro.json";

export const LANGUAGE_STORAGE_KEY = "language";
export type AppLanguage = "en" | "ro";

const DAYJS_LOCALES: Record<AppLanguage, string> = {
  en: "en-gb",
  ro: "ro",
};

function readStoredLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "en" || stored === "ro") return stored;
  } catch {
    // localStorage unavailable (private browsing, etc.) — fall back to default.
  }
  return "ro";
}

const initialLanguage = readStoredLanguage();
dayjs.locale(DAYJS_LOCALES[initialLanguage]);

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ro: { translation: ro },
  },
  lng: initialLanguage,
  fallbackLng: "ro",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  dayjs.locale(DAYJS_LOCALES[lng as AppLanguage] ?? DAYJS_LOCALES.ro);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    // localStorage unavailable — language choice just won't persist.
  }
});

export default i18n;
