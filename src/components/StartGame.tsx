import { useState } from 'react';

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
  const [suggestions, setSuggestions] = useState<Record<SearchField, string[]>>({
    start: [],
    target: [],
  });
  const [loadingField, setLoadingField] = useState<SearchField | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function search(field: SearchField, query: string) {
    setError('');
    if (query.trim().length < 2) {
      setSuggestions((current) => ({ ...current, [field]: [] }));
      return;
    }

    setLoadingField(field);
    try {
      const response = await fetch(`/api/wiki/search?lang=${lang}&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo buscar en Wikipedia.');
      }
      setSuggestions((current) => ({ ...current, [field]: data.results ?? [] }));
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'No se pudo buscar.');
    } finally {
      setLoadingField(null);
    }
  }

  async function startRun(event: React.FormEvent<HTMLFormElement>) {
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
        <label className="mb-2 block text-sm font-bold text-stone-800">{label}</label>
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-sky-700"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Busca un artículo"
            disabled={disabled || submitting}
            required
          />
          <button
            className="rounded-md bg-stone-950 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
            type="button"
            disabled={disabled || submitting || loadingField === field}
            onClick={() => search(field, value)}
          >
            {loadingField === field ? '...' : 'Buscar'}
          </button>
        </div>
        {suggestions[field].length > 0 ? (
          <div className="mt-2 grid gap-2">
            {suggestions[field].map((title) => (
              <button
                className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-left text-sm hover:border-sky-700"
                key={title}
                type="button"
                onClick={() => {
                  setValue(title);
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
          onChange={(event) => setLang(event.target.value)}
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
