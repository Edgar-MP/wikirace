import { describe, expect, it } from 'vitest';
import { canNavigateTo, sanitizeWikiHtml } from '@/lib/wiki/html';
import { sameTitle } from '@/lib/wiki/title';

describe('guest game flow with mocked article data', () => {
  it('moves through valid links and completes when the target is reached', () => {
    const pages = {
      Origen: {
        links: ['Puente'],
        html: '<p><a href="/wiki/Puente">Puente</a></p>',
      },
      Puente: {
        links: ['Destino'],
        html: '<p><a href="/wiki/Destino">Destino</a></p>',
      },
    };

    let currentTitle = 'Origen';
    let clicks = 0;
    const targetTitle = 'Destino';

    for (const toTitle of ['Puente', 'Destino']) {
      const page = pages[currentTitle as keyof typeof pages];
      expect(canNavigateTo(page.links, toTitle)).toBe(true);
      expect(sanitizeWikiHtml(page.html, page.links)).toContain('data-wiki-title');
      currentTitle = toTitle;
      clicks += 1;
    }

    expect(clicks).toBe(2);
    expect(sameTitle(currentTitle, targetTitle)).toBe(true);
  });
});
