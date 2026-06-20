import { useEffect, useRef, useCallback, useState } from "react";
import { useLanguage } from "@/i18n";
import { useAutoTranslate } from "@/hooks/use-auto-translate";
import { translateText } from "@/services/fasiri";

const ATTR_TRANSLATED = "data-t9n";
const ATTR_ORIGINAL = "data-t9n-orig";

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const { language, t } = useLanguage();
  const { translateBatch, translating } = useAutoTranslate();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLangRef = useRef(language);
  const [ready, setReady] = useState(true);

  const collectTextNodes = useCallback((): Map<string, Node[]> => {
    const map = new Map<string, Node[]>();
    if (!containerRef.current) return map;

    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const text = node.textContent?.trim();
          if (!text || text.length < 3) return NodeFilter.FILTER_REJECT;
          if (/^[\d\s,.\-%$€£¥+\-*/=():;!?@#&]+$/.test(text)) return NodeFilter.FILTER_REJECT;
          if (node.parentElement?.closest(`[${ATTR_TRANSLATED}]`)) return NodeFilter.FILTER_REJECT;
          if (node.parentElement?.closest("script, style, code, pre, [data-no-t9n]")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      },
      false
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent!.trim();
      if (!map.has(text)) map.set(text, []);
      map.get(text)!.push(node);
    }

    return map;
  }, []);

  const restoreOriginals = useCallback(() => {
    if (!containerRef.current) return;
    const nodes = containerRef.current.querySelectorAll(`[${ATTR_TRANSLATED}]`);
    nodes.forEach((el) => {
      const orig = el.getAttribute(ATTR_ORIGINAL);
      if (orig !== null) {
        el.textContent = orig;
      }
      el.removeAttribute(ATTR_TRANSLATED);
      el.removeAttribute(ATTR_ORIGINAL);
    });
  }, []);

  const restoreTextNodes = useCallback(() => {
    if (!containerRef.current) return;
    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (node.parentElement?.closest(`[${ATTR_TRANSLATED}]`)) return NodeFilter.FILTER_REJECT;
          if (!node.parentElement?.hasAttribute?.("data-t9n")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      },
      false
    );
    const toRestore: Node[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) toRestore.push(n);
    toRestore.forEach((node) => {
      const parent = node.parentElement;
      if (parent) {
        const orig = parent.getAttribute(ATTR_ORIGINAL);
        if (orig !== null) {
          node.textContent = orig;
        }
        parent.removeAttribute(ATTR_TRANSLATED);
        parent.removeAttribute(ATTR_ORIGINAL);
      }
    });
  }, []);

  useEffect(() => {
    if (language === "en") {
      restoreOriginals();
      restoreTextNodes();
      prevLangRef.current = language;
      return;
    }

    if (prevLangRef.current === language) return;
    prevLangRef.current = language;

    setReady(false);

    const timer = setTimeout(() => {
      const textMap = collectTextNodes();
      const texts = Array.from(textMap.keys());

      if (texts.length === 0) {
        setReady(true);
        return;
      }

      translateBatch(texts).then((translations) => {
        for (const [original, translated] of Object.entries(translations)) {
          if (translated !== original) {
            const nodes = textMap.get(original) || [];
            for (const node of nodes) {
              const parent = node.parentElement;
              if (parent) {
                parent.setAttribute(ATTR_TRANSLATED, "true");
                parent.setAttribute(ATTR_ORIGINAL, original);
              }
              node.textContent = translated;
            }
          }
        }
        setReady(true);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [language, collectTextNodes, translateBatch, restoreOriginals, restoreTextNodes]);

  return (
    <div
      ref={containerRef}
      className="translation-root"
      style={{ opacity: translating && language !== "en" ? 0.6 : 1, transition: "opacity 0.3s" }}
    >
      {children}
    </div>
  );
}
