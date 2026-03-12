import { actions, isInputError } from 'astro:actions';
import { useState } from 'react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

const inputClass =
  'mt-1 w-full bg-transparent border border-white/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 transition-colors';

const labelClass =
  'block text-[11px] uppercase tracking-[0.2em] text-white/70';

export default function NewsletterForm() {
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setFieldErrors({});
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);

    const { data, error } = await actions.newsletter(formData);

    if (error) {
      if (isInputError(error)) {
        const fields: Record<string, string> = {};
        for (const [field, msgs] of Object.entries(error.fields)) {
          fields[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
        }
        setFieldErrors(fields);
        setState('idle');
      } else {
        setErrorMessage(error.message ?? 'Ha ocurrido un error. Por favor, inténtalo de nuevo.');
        setState('error');
      }
      return;
    }

    if (data?.subscribed) {
      setState('success');
    }
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col gap-3 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold tracking-[0.2em] uppercase text-white">
            ¡Suscripción confirmada!
          </p>
        </div>
        <p className="text-xs text-white/60 leading-relaxed">
          Ya formas parte de nuestra newsletter. Te mantendremos informado de nuestros próximos eventos y producciones.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      {state === 'error' && (
        <div className="border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-400 tracking-wide">
          {errorMessage}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="nl-nombre" className={labelClass}>
          Nombre y apellidos
        </label>
        <input
          id="nl-nombre"
          name="nombre"
          type="text"
          required
          className={`${inputClass} ${fieldErrors.nombre ? 'border-red-500' : ''}`}
        />
        {fieldErrors.nombre && (
          <p className="text-[10px] text-red-400 tracking-wide mt-1">{fieldErrors.nombre}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="nl-email" className={labelClass}>
          Email
        </label>
        <input
          id="nl-email"
          name="email"
          type="email"
          required
          className={`${inputClass} ${fieldErrors.email ? 'border-red-500' : ''}`}
        />
        {fieldErrors.email && (
          <p className="text-[10px] text-red-400 tracking-wide mt-1">{fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            name="privacidad"
            type="checkbox"
            required
            className="mt-0.5 shrink-0 w-4 h-4 accent-cyan-400 cursor-pointer"
          />
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/60 leading-relaxed group-hover:text-white/80 transition-colors">
            Acepto la{' '}
            <a href="/politica-de-privacidad" className="underline hover:text-cyan-400 transition-colors">
              política de privacidad
            </a>
          </span>
        </label>
        {fieldErrors.privacidad && (
          <p className="text-[10px] text-red-400 tracking-wide mt-1">{fieldErrors.privacidad}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="mt-3 inline-flex items-center justify-center rounded-full bg-cyan-400 text-black px-8 py-2 text-xs font-semibold tracking-[0.25em] uppercase hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === 'submitting' ? (
          <span className="flex items-center gap-2">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Enviando…
          </span>
        ) : (
          'Suscribirse'
        )}
      </button>
    </form>
  );
}
