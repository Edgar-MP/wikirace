import sanitizeHtml from 'sanitize-html';
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

export function sanitizeWikiHtml(html: string, validLinks: string[]) {
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
      a: ['href', 'data-wiki-title', 'class'],
      '*': ['class', 'id'],
    },
    disallowedTagsMode: 'discard',
    transformTags: {
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
            href: '#',
            class: 'wiki-link',
            'data-wiki-title': canonicalTitle,
          },
        };
      },
      // sanitize-html's transformer type is stricter than its runtime contract for changed tag attrs.
    } as sanitizeHtml.IOptions['transformTags'],
  });
}
