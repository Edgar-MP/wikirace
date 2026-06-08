import sanitizeHtml from 'sanitize-html';
import type { WikiLang } from '@/lib/config';
import { normalizeTitle, titleFromHref, titleKey } from './title';

export function filterArticleLinks(links: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawLink of links) {
    const title = normalizeTitle(rawLink);
    const key = titleKey(title);
    if (!title || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(title);
  }

  return result;
}

export function canNavigateTo(links: string[], toTitle: string) {
  const targetKey = titleKey(toTitle);
  return links.some((link) => titleKey(link) === targetKey);
}

function normalizeMediaUrl(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  if (value.startsWith('//upload.wikimedia.org/')) {
    return `https:${value}`;
  }

  if (value.startsWith('https://upload.wikimedia.org/')) {
    return value;
  }

  if (value.startsWith('http://upload.wikimedia.org/')) {
    return value.replace('http://', 'https://');
  }

  return undefined;
}

function normalizeSrcSet(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .map((entry) => {
      const [url, descriptor] = entry.split(/\s+/, 2);
      const normalizedUrl = normalizeMediaUrl(url);
      if (!normalizedUrl) {
        return null;
      }

      return descriptor ? `${normalizedUrl} ${descriptor}` : normalizedUrl;
    })
    .filter((entry): entry is string => Boolean(entry));

  return entries.length > 0 ? entries.join(', ') : undefined;
}

export function sanitizeWikiHtml(html: string, validLinks: string[], lang: WikiLang = 'es') {
  const validLinkMap = new Map(validLinks.map((link) => [titleKey(link), normalizeTitle(link)]));

  return sanitizeHtml(html, {
    allowedTags: [
      'a',
      'abbr',
      'b',
      'blockquote',
      'br',
      'caption',
      'cite',
      'code',
      'dd',
      'div',
      'dl',
      'dt',
      'em',
      'figcaption',
      'figure',
      'img',
      'h1',
      'h2',
      'h3',
      'h4',
      'hr',
      'i',
      'li',
      'ol',
      'p',
      'pre',
      'small',
      'span',
      'strong',
      'sub',
      'sup',
      'table',
      'tbody',
      'td',
      'th',
      'thead',
      'tr',
      'ul',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'data-wiki-title', 'data-wiki-page', 'class'],
      img: ['src', 'srcset', 'alt', 'width', 'height', 'loading', 'decoding', 'class'],
      table: ['class', 'style'],
      td: ['class', 'colspan', 'rowspan', 'style'],
      th: ['class', 'colspan', 'rowspan', 'scope', 'style'],
      '*': ['class', 'id', 'title', 'role', 'aria-label'],
    },
    allowedSchemes: ['http', 'https', 'data'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    allowedStyles: {
      '*': {
        'text-align': [/^left$/, /^right$/, /^center$/],
        width: [/^\d+(\.\d+)?(px|em|rem|%)$/],
        'max-width': [/^\d+(\.\d+)?(px|em|rem|%)$/],
        float: [/^left$/, /^right$/],
        clear: [/^left$/, /^right$/, /^both$/],
      },
    },
    disallowedTagsMode: 'discard',
    transformTags: {
      img: (_tagName, attribs) => {
        const src = normalizeMediaUrl(attribs.src);
        if (!src) {
          return {
            tagName: 'span',
            attribs: {
              class: 'disabled-image',
            },
          };
        }

        const normalizedSrcSet = normalizeSrcSet(attribs.srcset);

        return {
          tagName: 'img',
          attribs: {
            src,
            ...(normalizedSrcSet ? { srcset: normalizedSrcSet } : {}),
            ...(attribs.alt ? { alt: attribs.alt } : { alt: '' }),
            ...(attribs.width ? { width: attribs.width } : {}),
            ...(attribs.height ? { height: attribs.height } : {}),
            ...(attribs.class ? { class: attribs.class } : {}),
            decoding: attribs.decoding ?? 'async',
            loading: attribs.loading ?? 'lazy',
          },
        };
      },
      a: (_tagName, attribs) => {
        const title = titleFromHref(attribs.href);
        const canonicalTitle = title ? validLinkMap.get(titleKey(title)) : null;

        if (!canonicalTitle) {
          return {
            tagName: 'span',
            attribs: {
              class: 'disabled-link',
            },
          };
        }

        return {
          tagName: 'a',
          attribs: {
            href: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(canonicalTitle.replaceAll(' ', '_'))}`,
            class: 'wiki-link',
            'data-wiki-title': canonicalTitle,
            'data-wiki-page': canonicalTitle.replaceAll(' ', '_'),
          },
        };
      },
      // sanitize-html's transformer type is stricter than its runtime contract for changed tag attrs.
    } as sanitizeHtml.IOptions['transformTags'],
  });
}
