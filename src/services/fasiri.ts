const FASIRI_BASE_URL = "https://fasiri-bu9u.onrender.com";

interface FasiriTranslateResponse {
  translated_text: string;
  provider: string;
  confidence?: number;
}

function getApiKey(): string {
  return import.meta.env.VITE_FASIRI_API_KEY || "";
}

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = "en",
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Fasiri API key not set (VITE_FASIRI_API_KEY)");
    return text;
  }

  const response = await fetch(`${FASIRI_BASE_URL}/api/v1/translate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      target_lang: targetLang,
      source_lang: sourceLang,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Fasiri API error (${response.status}): ${body || response.statusText}`,
    );
  }

  const data: FasiriTranslateResponse = await response.json();
  return data.translated_text;
}

const targetLanguages = ["lug", "ach", "nyn", "xog", "teo", "lgg"] as const;
export type UgandaLanguage = (typeof targetLanguages)[number];

export const ugandaLanguageLabels: Record<UgandaLanguage, string> = {
  lug: "Luganda",
  ach: "Acholi",
  nyn: "Runyankore",
  xog: "Lusoga",
  teo: "Ateso",
  lgg: "Lugbara",
};
