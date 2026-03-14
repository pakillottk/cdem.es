import { actions, isInputError } from 'astro:actions';
import { useState } from 'react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

const inputClass =
  'mt-1 w-full bg-transparent border border-white/40 px-3 py-2 text-sm outline-none focus:border-cyan-400 transition-colors';

const labelClass =
  'block text-xs sm:text-[11px] uppercase tracking-[0.25em] text-white/80';

export default function ContactForm() {
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setFieldErrors({});
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);

    const { data, error } = await actions.contact(formData);

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

    if (data?.sent) {
      setState('success');
    }
  }

  if (state === 'success') {
    return (
      <div className="border-2 border-cyan-400 px-6 sm:px-8 py-10 sm:py-12 flex flex-col items-center justify-center gap-4 text-center min-h-[360px]">
        <div className="w-12 h-12 rounded-full bg-cyan-400 flex items-center justify-center">
          <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold tracking-[0.2em] uppercase text-white">
          Mensaje enviado
        </h2>
        <p className="text-sm text-white/70 max-w-xs">
          Hemos recibido tu solicitud. Nos pondremos en contacto contigo lo antes posible.
        </p>
        <button
          onClick={() => setState('idle')}
          className="mt-2 inline-flex items-center justify-center rounded-full border border-white/40 px-8 py-2.5 text-xs tracking-[0.25em] uppercase hover:border-cyan-400 hover:text-cyan-400 transition-colors"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="border-2 border-white px-6 sm:px-8 py-8 sm:py-10 space-y-6"
    >
      {state === 'error' && (
        <div className="border border-red-500/60 bg-red-500/10 px-4 py-3 text-xs text-red-400 tracking-wide">
          {errorMessage}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="nombre" className={labelClass}>
          Nombre
        </label>
        <input
          id="nombre"
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
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
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
        <label htmlFor="telefono" className={labelClass}>
          Teléfono (opcional)
        </label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="mensaje" className={labelClass}>
          Mensaje
        </label>
        <textarea
          id="mensaje"
          name="mensaje"
          rows={5}
          required
          className={`${inputClass} resize-none ${fieldErrors.mensaje ? 'border-red-500' : ''}`}
        />
        {fieldErrors.mensaje && (
          <p className="text-[10px] text-red-400 tracking-wide mt-1">{fieldErrors.mensaje}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="inline-flex items-center justify-center rounded-full border border-white/80 bg-white/10 px-10 py-2.5 text-xs sm:text-sm tracking-[0.25em] uppercase hover:bg-cyan-400 hover:text-black hover:border-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === 'submitting' ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Enviando…
          </span>
        ) : (
          'Enviar mensaje'
        )}
      </button>
    </form>
  );
}
