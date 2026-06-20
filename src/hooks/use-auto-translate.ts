import { useState, useCallback, useRef } from "react";
import { translateText } from "@/services/fasiri";
import { useLanguage } from "@/i18n";

const CACHE_KEY = "fasiri_cache_";

interface TranslationCache {
  [sourceText: string]: string;
}

function getCache(lang: string): TranslationCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY + lang);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(lang: string, cache: TranslationCache) {
  try {
    localStorage.setItem(CACHE_KEY + lang, JSON.stringify(cache));
  } catch {
    /* quota exceeded */
  }
}

export function useAutoTranslate() {
  const { language, t } = useLanguage();
  const [translating, setTranslating] = useState(false);
  const cacheRef = useRef<TranslationCache>(getCache(language));
  const langRef = useRef(language);

  if (langRef.current !== language) {
    cacheRef.current = getCache(language);
    langRef.current = language;
  }

  const translate = useCallback(
    async (text: string): Promise<string> => {
      const trimmed = text.trim();
      if (!trimmed || language === "en") return text;

      // Check static translation keys first
      const staticMatch = findInTranslations(t, trimmed);
      if (staticMatch) return staticMatch;

      // Check cache
      if (cacheRef.current[trimmed]) return cacheRef.current[trimmed];

      setTranslating(true);
      try {
        const result = await translateText(trimmed, language);
        cacheRef.current[trimmed] = result;
        saveCache(language, cacheRef.current);
        return result;
      } catch {
        return text;
      } finally {
        setTranslating(false);
      }
    },
    [language, t]
  );

  const translateBatch = useCallback(
    async (texts: string[]): Promise<Record<string, string>> => {
      if (language === "en") {
        const identity: Record<string, string> = {};
        texts.forEach((t) => (identity[t] = t));
        return identity;
      }

      const results: Record<string, string> = {};
      const toTranslate: string[] = [];

      for (const text of texts) {
        const trimmed = text.trim();
        if (!trimmed) {
          results[text] = text;
          continue;
        }
        const staticMatch = findInTranslations(t, trimmed);
        if (staticMatch) {
          results[text] = staticMatch;
          continue;
        }
        if (cacheRef.current[trimmed]) {
          results[text] = cacheRef.current[trimmed];
          continue;
        }
        toTranslate.push(text);
      }

      if (toTranslate.length > 0) {
        setTranslating(true);
        try {
          for (const text of toTranslate) {
            try {
              const trimmed = text.trim();
              const translated = await translateText(trimmed, language);
              cacheRef.current[trimmed] = translated;
              results[text] = translated;
            } catch {
              results[text] = text;
            }
          }
          saveCache(language, cacheRef.current);
        } finally {
          setTranslating(false);
        }
      }

      return results;
    },
    [language, t]
  );

  return { translate, translateBatch, translating };
}

function findInTranslations(obj: any, target: string): string | null {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === "string") {
      if (val.toLowerCase() === target.toLowerCase()) return val;
    } else if (typeof val === "object" && val !== null) {
      const found = findInTranslations(val, target);
      if (found) return found;
    }
  }
  return null;
}
