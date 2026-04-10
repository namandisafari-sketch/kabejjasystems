import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { en, type TranslationKeys } from "./translations/en";
import { ar } from "./translations/ar";

export type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  isRTL: boolean;
}

const translations: Record<Language, TranslationKeys> = { en, ar };

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: en,
  isRTL: false,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return (saved === "ar" ? "ar" : "en") as Language;
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  }, []);

  const isRTL = language === "ar";

  // Apply RTL direction to document
  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
    if (isRTL) {
      document.documentElement.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
    }
  }, [isRTL, language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language], isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};
