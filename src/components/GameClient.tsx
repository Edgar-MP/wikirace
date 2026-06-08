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
    <div className="grid min-h-[calc(100vh-65px)] grid-cols-1 bg-white xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="wikipedia-frame min-w-0">
        <div className="wikipedia-topbar">
          <div aria-label="Wikipedia">
            <span className="wikipedia-wordmark">Wikipedia</span>
            <span className="wikipedia-submark">La enciclopedia libre</span>
          </div>
          <div className="wikipedia-search">Buscar en {lang}.wikipedia.org</div>
          <div className="ml-auto hidden gap-4 text-xs text-[#36c] md:flex">
            <span>Donaciones</span>
            <span>Crear una cuenta</span>
            <span>Acceder</span>
          </div>
        </div>

        <div className="wikipedia-shell">
          <aside className="wikipedia-sidebar" aria-label="Navegacion de Wikipedia">
            <h2>Contenidos</h2>
            <ul>
              <li><a>Inicio</a></li>
              <li><a>Actualidad</a></li>
              <li><a>Cambios recientes</a></li>
              <li><a>Articulo aleatorio</a></li>
              <li><a>Ayuda</a></li>
            </ul>
            <h2>Herramientas</h2>
            <ul>
              <li><a>Lo que enlaza aqui</a></li>
              <li><a>Cambios relacionados</a></li>
              <li><a>Subir archivo</a></li>
              <li><a>Version para imprimir</a></li>
            </ul>
          </aside>

          <main className="wikipedia-content">
            <div className="wikipedia-page-tabs">
              <nav aria-label="Pestanas de pagina">
                <span>Articulo</span>
                <span>Discusion</span>
              </nav>
              <nav aria-label="Acciones de pagina">
                <span>Leer</span>
                <span>Editar</span>
                <span>Ver historial</span>
              </nav>
            </div>

            <h1 className="wikipedia-title">{title}</h1>
            <div className="wikipedia-subtitle">Articulo de Wikipedia, la enciclopedia libre</div>

            {error ? (
              <p className="mb-4 border border-[#c8ccd1] bg-[#fff3cd] p-3 text-sm text-[#202122]">
                {error}
              </p>
            ) : null}
            {loading ? <p className="text-[#54595d]">Cargando articulo...</p> : null}
            {noLinks ? (
              <div className="mb-4 border border-[#a2a9b1] bg-[#f8f9fa] p-3 text-sm text-[#202122]">
                Esta pagina no tiene enlaces validos para continuar. Puedes abandonar la carrera o revisar tu ruta.
              </div>
            ) : null}
            {article && !loading ? (
              <div
                className="wiki-article"
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  const link = target.closest<HTMLAnchorElement>('a[data-wiki-title]');
                  if (!link) {
                    return;
                  }
                  event.preventDefault();
                  void navigateTo(link.dataset.wikiTitle ?? '');
                }}
                dangerouslySetInnerHTML={{ __html: article.html }}
              />
            ) : null}
          </main>
        </div>
      </div>

      <aside className="race-panel h-full p-5 xl:sticky xl:top-0 xl:h-screen">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#54595d]">WikiRace</p>
        <h2 className="mt-2 text-xl font-bold text-[#202122]">Objetivo: {targetTitle}</h2>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="border border-[#a2a9b1] bg-white p-3">
            <dt className="text-[#54595d]">Clicks</dt>
            <dd className="text-2xl font-bold">{clicks}</dd>
          </div>
          <div className="border border-[#a2a9b1] bg-white p-3">
            <dt className="text-[#54595d]">Tiempo</dt>
            <dd className="text-2xl font-bold">{complete?.durationSeconds ?? elapsedSeconds}s</dd>
          </div>
        </dl>

        {complete ? (
          <div className="mt-5 border border-[#a2a9b1] bg-white p-4 text-[#202122]">
            <strong className="block text-lg">Carrera completada</strong>
            Resultado: {complete.clicks} clicks en {complete.durationSeconds ?? 0}s.
            <a className="mt-3 block font-bold text-[#36c] underline underline-offset-4" href="/leaderboard">
              Ver ranking
            </a>
          </div>
        ) : null}

        <div className="mt-5">
          <h3 className="mb-2 border-b border-[#a2a9b1] pb-1 font-bold text-[#202122]">Ruta</h3>
          <ol className="grid gap-2 text-sm text-[#202122]">
            {history.map((item, index) => (
              <li className="border border-[#eaecf0] bg-white px-3 py-2" key={`${item}-${index}`}>
                {index}. {item}
              </li>
            ))}
          </ol>
        </div>

        <button
          className="mt-5 w-full border border-[#a2a9b1] bg-white px-4 py-2 font-bold text-[#202122] hover:bg-[#eaecf0]"
          type="button"
          onClick={() => void abandon()}
        >
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
