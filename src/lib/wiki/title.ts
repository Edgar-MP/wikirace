import { isSupportedLang, type WikiLang } from '@/lib/config';

const namespacePrefixes = [
  'special',
  'especial',
  'wikipedia',
  'file',
  'image',
  'template',
  'category',
  'help',
  'portal',
  'module',
  'mediawiki',
  'user',
  'talk',
  'discussion',
  'archivo',
  'imagen',
  'categoría',
  'ayuda',
  'plantilla',
  'usuario',
];

export function parseLang(value: string | null): WikiLang {
  if (!value || !isSupportedLang(value)) {
    throw new Error('Unsupported language.');
  }

  return value;
}

export function normalizeTitle(title: string) {
  return title
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function titleKey(title: string) {
  return normalizeTitle(title).toLocaleLowerCase();
}

export function sameTitle(a: string, b: string) {
  return titleKey(a) === titleKey(b);
}

export function isArticleTitle(title: string) {
  const normalized = normalizeTitle(title);
  if (!normalized || normalized.startsWith('#')) {
    return false;
  }

  const [prefix] = normalized.split(':', 1);
  return !namespacePrefixes.includes(prefix.toLocaleLowerCase());
}

export function titleFromHref(href: string | undefined) {
  if (!href) {
    return null;
  }

  try {
    const url = href.startsWith('http') ? new URL(href) : new URL(href, 'https://example.org');
    const path = decodeURIComponent(url.pathname);
    if (!path.startsWith('/wiki/')) {
      return null;
    }

    const title = normalizeTitle(path.replace('/wiki/', ''));
    return isArticleTitle(title) ? title : null;
  } catch {
    return null;
  }
}
