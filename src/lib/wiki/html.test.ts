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
      <img src="//upload.wikimedia.org/example.jpg" srcset="//upload.wikimedia.org/example-2x.jpg 2x" alt="Example" onclick="alert(1)" />
      <script>alert(1)</script>
    `;

    const sanitized = sanitizeWikiHtml(html, ['Ada Lovelace']);
    expect(sanitized).toContain('data-wiki-title="Ada Lovelace"');
    expect(sanitized).toContain('data-wiki-page="Ada_Lovelace"');
    expect(sanitized).toContain('href="https://es.wikipedia.org/wiki/Ada_Lovelace"');
    expect(sanitized).toContain('src="https://upload.wikimedia.org/example.jpg"');
    expect(sanitized).toContain('srcset="https://upload.wikimedia.org/example-2x.jpg 2x"');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('disabled-link');
  });

  it('drops non-Wikimedia images', () => {
    const sanitized = sanitizeWikiHtml('<img src="https://example.com/tracker.png" />', []);
    expect(sanitized).not.toContain('<img');
    expect(sanitized).toContain('disabled-image');
  });
});
