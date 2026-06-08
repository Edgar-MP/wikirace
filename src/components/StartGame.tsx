import { useEffect, useState, type FormEvent } from 'react';

type CurrentUser = {
  id: string;
  displayName: string;
  email: string;
} | null;

type Props = {
  currentUser: CurrentUser;
  disabled?: boolean;
};

type SearchField = 'start' | 'target';

export default function StartGame({ currentUser, disabled = false }: Props) {
  const [lang, setLang] = useState('es');
  const [guestAlias, setGuestAlias] = useState('');
  const [startTitle, setStartTitle] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [selectedTitles, setSelectedTitles] = useState<Record<SearchField, string>>({
    start: '',
    target: '',
  });
  const [suggestions, setSuggestions] = useState<Record<SearchField, string[]>>({
    start: [],
    target: [],
  });
  const [loadingField, setLoadingField] = useState<SearchField | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function search(field: SearchField, query: string, signal: AbortSignal) {
    setError('');
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setSuggestions((current) => ({ ...current, [field]: [] }));
      return;
    }

    setLoadingField(field);
    try {
      const response = await fetch(
        `/api/wiki/search?lang=${lang}&q=${encodeURIComponent(normalizedQuery)}`,
        { signal },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo buscar en Wikipedia.');
      }

      setSuggestions((current) => ({ ...current, [field]: data.results ?? [] }));
    } catch (searchError) {
      if (searchError instanceof DOMException && searchError.name === 'AbortError') {
        return;
      }

      setError(searchError instanceof Error ? searchError.message : 'No se pudo buscar.');
    } finally {
      if (!signal.aborted) {
        setLoadingField((current) => (current === field ? null : current));
      }
    }
  }

  useEffect(() => {
    if (disabled || submitting || selectedTitles.start === startTitle) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void search('start', startTitle, controller.signal);
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, submitting, selectedTitles.start, startTitle, lang]);

  useEffect(() => {
    if (disabled || submitting || selectedTitles.target === targetTitle) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void search('target', targetTitle, controller.signal);
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, submitting, selectedTitles.target, targetTitle, lang]);

  async function startRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const challengeResponse = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lang, startTitle, targetTitle }),
      });
      const challengeData = await challengeResponse.json();
      if (!challengeResponse.ok) {
        throw new Error(challengeData.error ?? 'No se pudo crear el reto.');
      }

      const runResponse = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          challengeId: challengeData.challenge.id,
          guestAlias: currentUser ? undefined : guestAlias,
        }),
      });
      const runData = await runResponse.json();
      if (!runResponse.ok) {
        throw new Error(runData.error ?? 'No se pudo iniciar la carrera.');
      }

      window.location.href = runData.playUrl;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo iniciar.');
    } finally {
      setSubmitting(false);
    }
  }

  function renderArticleInput(label: string, field: SearchField, value: string, setValue: (value: string) => void) {
    return (
      <div>
        <label className="mb-2 block text-sm font-bold text-stone-800" htmlFor={`${field}-title`}>
          {label}
        </label>
        <input
          id={`${field}-title`}
          className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-sky-700"
          value={value}
          onChange={(event) => {
            setSelectedTitles((current) => ({ ...current, [field]: '' }));
            setValue(event.target.value);
          }}
          placeholder="Busca un artículo"
          disabled={disabled || submitting}
          autoComplete="off"
          required
        />

        {loadingField === field ? <p className="mt-2 text-xs font-semibold text-stone-500">Buscando...</p> : null}

        {suggestions[field].length > 0 ? (
          <div className="mt-2 grid gap-2">
            {suggestions[field].map((title) => (
              <button
                className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-left text-sm hover:border-sky-700"
                key={title}
                type="button"
                onClick={() => {
                  setValue(title);
                  setSelectedTitles((current) => ({ ...current, [field]: title }));
                  setSuggestions((current) => ({ ...current, [field]: [] }));
                }}
              >
                {title}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={startRun}>
      <div>
        <h2 className="text-2xl font-black text-stone-950">Crear carrera</h2>
        <p className="mt-1 text-sm text-stone-600">
          {currentUser ? `Juegas como ${currentUser.displayName}.` : 'Puedes jugar como invitado con alias.'}
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-stone-800" htmlFor="wiki-lang">
          Wikipedia
        </label>
        <select
          id="wiki-lang"
          className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-sky-700"
          value={lang}
          disabled={disabled || submitting}
          onChange={(event) => {
            setSelectedTitles({ start: '', target: '' });
            setLang(event.target.value);
          }}
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>

      {!currentUser ? (
        <div>
          <label className="mb-2 block text-sm font-bold text-stone-800" htmlFor="guest-alias">
            Alias
          </label>
          <input
            id="guest-alias"
            className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-sky-700"
            value={guestAlias}
            onChange={(event) => setGuestAlias(event.target.value)}
            placeholder="Tu nombre en el ranking"
            disabled={disabled || submitting}
            required
            minLength={2}
            maxLength={40}
          />
        </div>
      ) : null}

      {renderArticleInput('Origen', 'start', startTitle, setStartTitle)}
      {renderArticleInput('Objetivo', 'target', targetTitle, setTargetTitle)}

      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}

      <button
        className="rounded-md bg-sky-800 px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-stone-300"
        disabled={disabled || submitting}
      >
        {submitting ? 'Creando carrera...' : 'Empezar'}
      </button>
    </form>
  );
}
