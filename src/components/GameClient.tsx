import { useEffect, useMemo, useState } from 'react';

type Article = {
  title: string;
  html: string;
  links: string[];
  isTarget: boolean;
  targetTitle: string;
  clicks: number;
};

type Props = {
  runId: string;
  initialTitle: string;
  targetTitle: string;
  lang: string;
  initialClicks: number;
};

export default function GameClient({ runId, initialTitle, targetTitle, lang, initialClicks }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [article, setArticle] = useState<Article | null>(null);
  const [clicks, setClicks] = useState(initialClicks);
  const [history, setHistory] = useState<string[]>([initialTitle]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState<{ clicks: number; durationSeconds: number | null } | null>(null);
  const [startedAt] = useState(() => Date.now());
  const elapsedSeconds = useElapsedSeconds(startedAt, Boolean(complete));

  async function loadArticle(nextTitle: string) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/runs/${runId}/article?title=${encodeURIComponent(nextTitle)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo cargar el articulo.');
      }
      setArticle(data);
      setClicks(data.clicks);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (complete) {
      return;
    }

    void loadArticle(title);
  }, [title, complete]);

  async function navigateTo(toTitle: string) {
    if (navigating || complete) {
      return;
    }

    setNavigating(true);
    setError('');
    try {
      const response = await fetch(`/api/runs/${runId}/navigate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toTitle }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo navegar.');
      }

      setClicks(data.run.clicks);
      setTitle(data.currentTitle);
      setHistory((current) => [...current, data.currentTitle]);

      if (data.completed) {
        setComplete({
          clicks: data.run.clicks,
          durationSeconds: data.durationSeconds,
        });
      }
    } catch (navigationError) {
      setError(navigationError instanceof Error ? navigationError.message : 'No se pudo navegar.');
    } finally {
      setNavigating(false);
    }
  }

  async function abandon() {
    await fetch(`/api/runs/${runId}/abandon`, { method: 'POST' });
    window.location.href = '/';
  }

  const noLinks = useMemo(() => article && article.links.length === 0, [article]);

  return (
    <div className="game-shell">
      <main className={`wiki-wrapper lang-${lang}`}>
        <div className="pre-content heading-holder">
          <div className="page-heading">
            <h1 id="section_0">{title}</h1>
          </div>
          <div className="minerva__subtitle">De Wikipedia, la enciclopedia libre</div>
        </div>

        {error ? <p className="wiki-game-message wiki-game-message-error">{error}</p> : null}
        {loading ? <p className="wiki-game-message">Cargando articulo...</p> : null}
        {noLinks ? (
          <div className="wiki-game-message">
            Esta pagina no tiene enlaces validos para continuar. Puedes abandonar la carrera o revisar tu ruta.
          </div>
        ) : null}

        {article && !loading ? (
          <div
            className="content"
            onClick={(event) => {
              const target = event.target as HTMLElement;
              const link = target.closest<HTMLAnchorElement>('a[data-wiki-title]');
              if (!link) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              void navigateTo(link.dataset.wikiTitle ?? '');
            }}
            dangerouslySetInnerHTML={{ __html: article.html }}
          />
        ) : null}
      </main>

      <aside className="race-panel">
        <p className="race-panel-kicker">WikiRace</p>
        <h2>Destino</h2>
        <strong className="race-destination">{targetTitle}</strong>

        <dl className="race-stats">
          <div>
            <dt>Clicks</dt>
            <dd>{clicks}</dd>
          </div>
          <div>
            <dt>Tiempo</dt>
            <dd>{complete?.durationSeconds ?? elapsedSeconds}s</dd>
          </div>
        </dl>

        {complete ? (
          <div className="race-complete">
            <strong>Carrera completada</strong>
            <span>
              Resultado: {complete.clicks} clicks en {complete.durationSeconds ?? 0}s.
            </span>
            <a href="/leaderboard">Ver ranking</a>
          </div>
        ) : null}

        <div className="race-path">
          <h3>Ruta</h3>
          <ol>
            {history.map((item, index) => (
              <li key={`${item}-${index}`}>
                {index}. {item}
              </li>
            ))}
          </ol>
        </div>

        <button type="button" onClick={() => void abandon()}>
          Abandonar
        </button>
      </aside>
    </div>
  );
}

function useElapsedSeconds(startedAt: number, stopped: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (stopped) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [startedAt, stopped]);

  return elapsedSeconds;
}
