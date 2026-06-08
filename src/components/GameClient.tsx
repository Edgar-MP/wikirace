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
        throw new Error(data.error ?? 'No se pudo cargar el artículo.');
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <article className="min-w-0 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4 border-b border-stone-200 pb-4">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-sky-800">{lang}.wikipedia.org</p>
          <h1 className="mt-2 text-3xl font-black text-stone-950">{title}</h1>
        </div>

        {error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}
        {loading ? <p className="text-stone-600">Cargando artículo...</p> : null}
        {noLinks ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
            Esta página no tiene enlaces válidos para continuar. Puedes abandonar la carrera o revisar tu ruta.
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
      </article>

      <aside className="h-fit rounded-lg border border-stone-200 bg-[#fffdf7] p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-sky-800">Objetivo</p>
        <h2 className="mt-2 text-2xl font-black text-stone-950">{targetTitle}</h2>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-white p-3">
            <dt className="text-stone-500">Clicks</dt>
            <dd className="text-2xl font-black">{clicks}</dd>
          </div>
          <div className="rounded-md bg-white p-3">
            <dt className="text-stone-500">Tiempo</dt>
            <dd className="text-2xl font-black">{complete?.durationSeconds ?? elapsedSeconds}s</dd>
          </div>
        </dl>

        {complete ? (
          <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <strong className="block text-lg">Carrera completada</strong>
            Resultado: {complete.clicks} clicks en {complete.durationSeconds ?? 0}s.
            <a className="mt-3 block font-bold underline underline-offset-4" href="/leaderboard">
              Ver ranking
            </a>
          </div>
        ) : null}

        <div className="mt-5">
          <h3 className="mb-2 font-bold text-stone-950">Ruta</h3>
          <ol className="grid gap-2 text-sm text-stone-700">
            {history.map((item, index) => (
              <li className="rounded-md bg-white px-3 py-2" key={`${item}-${index}`}>
                {index}. {item}
              </li>
            ))}
          </ol>
        </div>

        <button
          className="mt-5 w-full rounded-md border border-stone-300 px-4 py-2 font-bold text-stone-700 hover:border-red-700 hover:text-red-800"
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
