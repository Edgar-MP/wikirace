import { describe, expect, it } from 'vitest';
import { canNavigateTo, filterArticleLinks, sanitizeWikiHtml } from './html';

describe('wiki html helpers', () => {
  it('deduplicates article links while preserving first casing', () => {
    expect(filterArticleLinks(['Alan_Turing', 'Alan Turing', 'Ada Lovelace'])).toEqual([
      'Alan Turing',
      'Ada Lovelace',
    ]);
  });

  it('validates navigation against available links', () => {
    expect(canNavigateTo(['Ada Lovelace'], 'Ada_Lovelace')).toBe(true);
    expect(canNavigateTo(['Ada Lovelace'], 'Grace Hopper')).toBe(false);
  });

  it('keeps only playable wiki links and strips scripts', () => {
    const html = `
      <p><a href="/wiki/Ada_Lovelace" onclick="alert(1)">Ada</a></p>
      <p><a href="/wiki/Special:Random">Random</a></p>
      <script>alert(1)</script>
    `;

    const sanitized = sanitizeWikiHtml(html, ['Ada Lovelace']);
    expect(sanitized).toContain('data-wiki-title="Ada Lovelace"');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('disabled-link');
  });
});
