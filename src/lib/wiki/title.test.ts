import { describe, expect, it } from 'vitest';
import { isArticleTitle, normalizeTitle, sameTitle, titleFromHref } from './title';

describe('wiki title helpers', () => {
  it('normalizes underscores and repeated spaces', () => {
    expect(normalizeTitle(' Alan__Turing  ')).toBe('Alan Turing');
  });

  it('compares titles case-insensitively', () => {
    expect(sameTitle('Alan Turing', 'alan_turing')).toBe(true);
  });

  it('rejects non-article namespaces', () => {
    expect(isArticleTitle('Especial:Buscar')).toBe(false);
    expect(isArticleTitle('File:Example.png')).toBe(false);
    expect(isArticleTitle('Alan Turing')).toBe(true);
  });

  it('extracts article titles from wiki hrefs', () => {
    expect(titleFromHref('/wiki/Alan_Turing')).toBe('Alan Turing');
    expect(titleFromHref('https://es.wikipedia.org/wiki/Ada_Lovelace')).toBe('Ada Lovelace');
    expect(titleFromHref('/w/index.php?title=Alan_Turing')).toBeNull();
  });
});
