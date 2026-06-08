import { nanoid } from 'nanoid';
import { and, eq, gt } from 'drizzle-orm';
import { wikiUserAgent, type WikiLang } from '@/lib/config';
import { getDb } from '@/lib/db/client';
import { wikiPageCache } from '@/lib/db/schema';
import { filterArticleLinks, sanitizeWikiHtml } from './html';
import { isArticleTitle, normalizeTitle, titleKey } from './title';

type WikiSearchResponse = {
  query?: {
    search?: Array<{ title: string }>;
  };
};

type WikiParseResponse = {
  error?: { info?: string };
  parse?: {
    title: string;
    text: string;
    links: Array<{ ns: number; title: string; exists?: boolean }>;
  };
};

export type WikiPage = {
  title: string;
  html: string;
  links: string[];
};

function apiBase(lang: WikiLang) {
  return `https://${lang}.wikipedia.org/w/api.php`;
}

async function fetchJson<T>(url: URL) {
  const response = await fetch(url, {
    headers: {
      'Api-User-Agent': wikiUserAgent(),
      'User-Agent': wikiUserAgent(),
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Wikipedia request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function searchWikipedia(lang: WikiLang, query: string) {
  const url = new URL(apiBase(lang));
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  url.searchParams.set('srsearch', query);
  url.searchParams.set('srlimit', '8');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');

  const data = await fetchJson<WikiSearchResponse>(url);
  return (data.query?.search ?? [])
    .map((item) => normalizeTitle(item.title))
    .filter((title) => title && isArticleTitle(title));
}

async function fetchWikipediaPage(lang: WikiLang, title: string): Promise<WikiPage> {
  const url = new URL(apiBase(lang));
  url.searchParams.set('action', 'parse');
  url.searchParams.set('page', normalizeTitle(title));
  url.searchParams.set('prop', 'text|links');
  url.searchParams.set('redirects', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');

  const data = await fetchJson<WikiParseResponse>(url);
  if (data.error || !data.parse) {
    throw new Error(data.error?.info ?? 'Wikipedia article not found.');
  }

  const links = filterArticleLinks(
    data.parse.links
      .filter((link) => link.ns === 0 && link.exists !== false && isArticleTitle(link.title))
      .map((link) => link.title),
  );

  return {
    title: normalizeTitle(data.parse.title),
    html: sanitizeWikiHtml(data.parse.text, links),
    links,
  };
}

function cacheExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

export async function getCachedWikipediaPage(lang: WikiLang, title: string) {
  const db = getDb();
  const normalizedTitle = normalizeTitle(title);
  const [cached] = await db
    .select()
    .from(wikiPageCache)
    .where(
      and(
        eq(wikiPageCache.lang, lang),
        eq(wikiPageCache.title, titleKey(normalizedTitle)),
        gt(wikiPageCache.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (cached) {
    return {
      title: cached.canonicalTitle,
      html: cached.html,
      links: cached.links,
    };
  }

  const page = await fetchWikipediaPage(lang, normalizedTitle);
  await db
    .insert(wikiPageCache)
    .values({
      id: nanoid(18),
      lang,
      title: titleKey(normalizedTitle),
      canonicalTitle: page.title,
      html: page.html,
      links: page.links,
      expiresAt: cacheExpiry(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [wikiPageCache.lang, wikiPageCache.title],
      set: {
        canonicalTitle: page.title,
        html: page.html,
        links: page.links,
        expiresAt: cacheExpiry(),
        updatedAt: new Date(),
      },
    });

  return page;
}
