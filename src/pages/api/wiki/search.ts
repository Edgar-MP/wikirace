import type { APIRoute } from 'astro';
import { parseLang } from '@/lib/wiki/title';
import { handleApiError, json } from '@/lib/http';
import { searchWikipedia } from '@/lib/wiki/client';

export const GET: APIRoute = async ({ url }) => {
  try {
    const lang = parseLang(url.searchParams.get('lang'));
    const query = url.searchParams.get('q')?.trim() ?? '';

    if (query.length < 2) {
      return json({ results: [] });
    }

    const results = await searchWikipedia(lang, query);
    return json({ results });
  } catch (error) {
    return handleApiError(error);
  }
};
