import { actions, isInputError } from 'astro:actions';
import { TURNSTILE_SITE_KEY } from 'astro:env/client';
import { useState } from 'react';
import Turnstile from './Turnstile';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

const inputClass =
  'mt-1 w-full bg-transparent border border-black px-3 py-2 text-sm text-black outline-none focus:border-[var(--color-primary)] transition-colors';

const labelClass =
  'block text-sm sm:text-xs uppercase tracking-[0.25em] text-black/70';

export default function MinorAuthorizationRequestForm() {
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!turnstileToken) {
      setErrorMessage('Por favor, completa la verificación de seguridad.');
      setState('error');
      return;
    }

    setState('submitting');
    setFieldErrors({});
    setErrorMessage('');

    const formData = new FormData(event.currentTarget);
    formData.set('turnstileToken', turnstileToken);

    const { data, error } = await actions.minorAuthorizationRequest(formData);

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
      <div className="border-2 border-[var(--color-primary)] px-6 sm:px-8 py-10 sm:py-12 text-center space-y-4">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-[0.2em] uppercase text-black">
          Solicitud enviada
        </h2>
        <p className="text-sm text-black/60 max-w-md mx-auto">
          Te hemos enviado un correo con el enlace para firmar la autorización. Revisa tu bandeja de entrada.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="border-2 border-black px-6 sm:px-8 py-8 sm:py-10 space-y-6 font-secondary">
      {state === 'error' && (
        <div className="border border-red-500/60 bg-red-500/10 px-4 py-3 text-xs text-red-400 tracking-wide">
          {errorMessage}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="eventName" className={labelClass}>Evento</label>
        <input id="eventName" name="eventName" type="text" required className={`${inputClass} ${fieldErrors.eventName ? 'border-red-500' : ''}`} />
        {fieldErrors.eventName && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.eventName}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="eventDate" className={labelClass}>Fecha del evento (opcional)</label>
        <input id="eventDate" name="eventDate" type="date" className={inputClass} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="minorName" className={labelClass}>Nombre del menor</label>
          <input id="minorName" name="minorName" type="text" required className={`${inputClass} ${fieldErrors.minorName ? 'border-red-500' : ''}`} />
          {fieldErrors.minorName && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.minorName}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="minorBirthDate" className={labelClass}>Fecha de nacimiento</label>
          <input id="minorBirthDate" name="minorBirthDate" type="date" required className={`${inputClass} ${fieldErrors.minorBirthDate ? 'border-red-500' : ''}`} />
          {fieldErrors.minorBirthDate && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.minorBirthDate}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="minorDni" className={labelClass}>DNI del menor (opcional)</label>
        <input id="minorDni" name="minorDni" type="text" className={inputClass} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="parentName" className={labelClass}>Nombre del tutor</label>
          <input id="parentName" name="parentName" type="text" required className={`${inputClass} ${fieldErrors.parentName ? 'border-red-500' : ''}`} />
          {fieldErrors.parentName && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.parentName}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="parentDni" className={labelClass}>DNI del tutor</label>
          <input id="parentDni" name="parentDni" type="text" required className={`${inputClass} ${fieldErrors.parentDni ? 'border-red-500' : ''}`} />
          {fieldErrors.parentDni && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.parentDni}</p>}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="parentPhone" className={labelClass}>Teléfono del tutor</label>
          <input id="parentPhone" name="parentPhone" type="tel" required className={`${inputClass} ${fieldErrors.parentPhone ? 'border-red-500' : ''}`} />
          {fieldErrors.parentPhone && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.parentPhone}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="parentAddress" className={labelClass}>Domicilio (opcional)</label>
          <input id="parentAddress" name="parentAddress" type="text" className={inputClass} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="requesterName" className={labelClass}>Nombre de quien recibe el correo</label>
          <input id="requesterName" name="requesterName" type="text" required className={`${inputClass} ${fieldErrors.requesterName ? 'border-red-500' : ''}`} />
          {fieldErrors.requesterName && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.requesterName}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="requesterEmail" className={labelClass}>Correo electrónico</label>
          <input id="requesterEmail" name="requesterEmail" type="email" required className={`${inputClass} ${fieldErrors.requesterEmail ? 'border-red-500' : ''}`} />
          {fieldErrors.requesterEmail && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.requesterEmail}</p>}
        </div>
      </div>

      <details className="border border-black/15 px-4 py-3">
        <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-black/70">
          Adulto acompañante (opcional)
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <input name="companionName" type="text" placeholder="Nombre" className={inputClass} />
          <input name="companionDni" type="text" placeholder="DNI" className={inputClass} />
          <input name="companionPhone" type="tel" placeholder="Teléfono" className={inputClass} />
        </div>
      </details>

      {TURNSTILE_SITE_KEY && (
        <Turnstile
          siteKey={TURNSTILE_SITE_KEY}
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken('')}
          onError={() => setTurnstileToken('')}
        />
      )}

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="inline-flex items-center justify-center rounded-full border border-black px-10 py-2.5 text-sm tracking-[0.25em] uppercase text-black hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
      >
        {state === 'submitting' ? 'Enviando…' : 'Solicitar enlace de firma'}
      </button>
    </form>
  );
}
