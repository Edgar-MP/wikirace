export const supportedLangs = ['es', 'en'] as const;
export type WikiLang = (typeof supportedLangs)[number];

export const wikiLangLabels: Record<WikiLang, string> = {
  es: 'Español',
  en: 'English',
};

export function isSupportedLang(value: string): value is WikiLang {
  return supportedLangs.includes(value as WikiLang);
}

export function requireSupportedLang(value: string): WikiLang {
  if (!isSupportedLang(value)) {
    throw new Error(`Unsupported Wikipedia language: ${value}`);
  }

  return value;
}

export function appOrigin() {
  return process.env.WIKIRACE_PUBLIC_URL ?? 'http://localhost:4321';
}

export function wikiUserAgent() {
  const contact = process.env.WIKIRACE_CONTACT ?? 'local-dev@example.com';
  return `WikiRace/0.1 (${appOrigin()}; ${contact})`;
}
