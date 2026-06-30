import { actions, isInputError } from 'astro:actions';
import { TURNSTILE_SITE_KEY } from 'astro:env/client';
import { useState } from 'react';
import type { EventoFormOption } from '../lib/eventos';
import Turnstile from './Turnstile';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

interface Props {
  events: EventoFormOption[];
}

const inputClass =
  'mt-1 w-full bg-transparent border border-black px-3 py-2 text-sm text-black outline-none focus:border-[var(--color-primary)] transition-colors';

const labelClass =
  'block text-sm sm:text-xs uppercase tracking-[0.25em] text-black/70';

const requiredMark = <span className="text-red-500 normal-case tracking-normal"> (obligatorio)</span>;

const radioGroupClass = 'mt-2 flex flex-wrap gap-4';
const radioLabelClass = 'inline-flex items-center gap-2 text-sm text-black cursor-pointer';
const halfGridClass = 'grid gap-6 sm:grid-cols-2';

export default function MinorAuthorizationRequestForm({ events }: Props) {
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState('');
  const [selectedTitle, setSelectedTitle] = useState(events[0]?.title ?? '');
  const [minorCount, setMinorCount] = useState(1);
  const [hasSecondTutor, setHasSecondTutor] = useState(false);

  const selectedEvent = events.find((evento) => evento.title === selectedTitle);
  const selectedEventDate = selectedEvent?.eventDate ?? '';

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

  if (events.length === 0) {
    return (
      <div className="border-2 border-black/15 px-6 py-8 text-center text-sm text-black/60">
        No hay eventos disponibles en este momento.
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
        <select
          id="eventName"
          name="eventName"
          required
          value={selectedTitle}
          onChange={(event) => setSelectedTitle(event.target.value)}
          className={`${inputClass} ${fieldErrors.eventName ? 'border-red-500' : ''}`}
        >
          {events.map((evento) => (
            <option key={`${evento.title}-${evento.eventDate}`} value={evento.title}>
              {evento.title}
            </option>
          ))}
        </select>
        {fieldErrors.eventName && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.eventName}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="eventDate" className={labelClass}>Fecha del evento</label>
        <input
          id="eventDate"
          name="eventDate"
          type="date"
          readOnly
          value={selectedEventDate}
          className={`${inputClass} bg-black/5`}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="entryCode" className={labelClass}>Código de la entrada</label>
        <input
          id="entryCode"
          name="entryCode"
          type="text"
          autoComplete="off"
          className={`${inputClass} ${fieldErrors.entryCode ? 'border-red-500' : ''}`}
        />
        {fieldErrors.entryCode && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.entryCode}</p>}
      </div>

      <fieldset className="space-y-1">
        <legend className={labelClass}>Número de menores</legend>
        <div className={radioGroupClass}>
          {[1, 2, 3].map((count) => (
            <label key={count} className={radioLabelClass}>
              <input
                type="radio"
                name="minorCount"
                value={String(count)}
                checked={minorCount === count}
                onChange={() => setMinorCount(count)}
                required
              />
              {count}
            </label>
          ))}
        </div>
        {fieldErrors.minorCount && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.minorCount}</p>}
      </fieldset>

      {minorCount >= 1 && (
        <div className="space-y-4 border border-black/10 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/60">Menor 1</p>
          <div className="space-y-1">
            <label htmlFor="minorName" className={labelClass}>Nombre y apellidos{requiredMark}</label>
            <input id="minorName" name="minorName" type="text" required className={`${inputClass} ${fieldErrors.minorName ? 'border-red-500' : ''}`} />
            {fieldErrors.minorName && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.minorName}</p>}
          </div>
          <div className={halfGridClass}>
            <div className="space-y-1">
              <label htmlFor="minorBirthDate" className={labelClass}>Fecha de nacimiento{requiredMark}</label>
              <input id="minorBirthDate" name="minorBirthDate" type="date" required className={`${inputClass} ${fieldErrors.minorBirthDate ? 'border-red-500' : ''}`} />
              {fieldErrors.minorBirthDate && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.minorBirthDate}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="minorDni" className={labelClass}>DNI del menor (opcional)</label>
              <input id="minorDni" name="minorDni" type="text" className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {minorCount >= 2 && (
        <div className="space-y-4 border border-black/10 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/60">Menor 2</p>
          <div className="space-y-1">
            <label htmlFor="minor2Name" className={labelClass}>Nombre y apellidos{requiredMark}</label>
            <input id="minor2Name" name="minor2Name" type="text" required className={`${inputClass} ${fieldErrors.minor2Name ? 'border-red-500' : ''}`} />
            {fieldErrors.minor2Name && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.minor2Name}</p>}
          </div>
          <div className={halfGridClass}>
            <div className="space-y-1">
              <label htmlFor="minor2BirthDate" className={labelClass}>Fecha de nacimiento{requiredMark}</label>
              <input id="minor2BirthDate" name="minor2BirthDate" type="date" required className={`${inputClass} ${fieldErrors.minor2BirthDate ? 'border-red-500' : ''}`} />
              {fieldErrors.minor2BirthDate && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.minor2BirthDate}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="minor2Dni" className={labelClass}>DNI del menor (opcional)</label>
              <input id="minor2Dni" name="minor2Dni" type="text" className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {minorCount >= 3 && (
        <div className="space-y-4 border border-black/10 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/60">Menor 3</p>
          <div className="space-y-1">
            <label htmlFor="minor3Name" className={labelClass}>Nombre y apellidos{requiredMark}</label>
            <input id="minor3Name" name="minor3Name" type="text" required className={`${inputClass} ${fieldErrors.minor3Name ? 'border-red-500' : ''}`} />
            {fieldErrors.minor3Name && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.minor3Name}</p>}
          </div>
          <div className={halfGridClass}>
            <div className="space-y-1">
              <label htmlFor="minor3BirthDate" className={labelClass}>Fecha de nacimiento{requiredMark}</label>
              <input id="minor3BirthDate" name="minor3BirthDate" type="date" required className={`${inputClass} ${fieldErrors.minor3BirthDate ? 'border-red-500' : ''}`} />
              {fieldErrors.minor3BirthDate && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.minor3BirthDate}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="minor3Dni" className={labelClass}>DNI del menor (opcional)</label>
              <input id="minor3Dni" name="minor3Dni" type="text" className={inputClass} />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="parentName" className={labelClass}>Nombre y apellidos{requiredMark}</label>
        <input id="parentName" name="parentName" type="text" required className={`${inputClass} ${fieldErrors.parentName ? 'border-red-500' : ''}`} />
        {fieldErrors.parentName && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.parentName}</p>}
      </div>

      <div className={halfGridClass}>
        <div className="space-y-1">
          <label htmlFor="parentDni" className={labelClass}>DNI del tutor{requiredMark}</label>
          <input id="parentDni" name="parentDni" type="text" required className={`${inputClass} ${fieldErrors.parentDni ? 'border-red-500' : ''}`} />
          {fieldErrors.parentDni && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.parentDni}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="parentPhone" className={labelClass}>Teléfono del tutor</label>
          <input id="parentPhone" name="parentPhone" type="tel" required className={`${inputClass} ${fieldErrors.parentPhone ? 'border-red-500' : ''}`} />
          {fieldErrors.parentPhone && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.parentPhone}</p>}
        </div>
      </div>

      <fieldset className="space-y-1">
        <legend className={labelClass}>¿Hay un segundo tutor que autoriza?</legend>
        <div className={radioGroupClass}>
          <label className={radioLabelClass}>
            <input
              type="radio"
              name="hasSecondTutor"
              value="no"
              checked={!hasSecondTutor}
              onChange={() => setHasSecondTutor(false)}
              required
            />
            No
          </label>
          <label className={radioLabelClass}>
            <input
              type="radio"
              name="hasSecondTutor"
              value="yes"
              checked={hasSecondTutor}
              onChange={() => setHasSecondTutor(true)}
              required
            />
            Sí
          </label>
        </div>
        {fieldErrors.hasSecondTutor && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.hasSecondTutor}</p>}
      </fieldset>

      {hasSecondTutor && (
        <div className="space-y-4 border border-black/10 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/60">Segundo tutor</p>
          <div className="space-y-1">
            <label htmlFor="secondParentName" className={labelClass}>Nombre y apellidos{requiredMark}</label>
            <input id="secondParentName" name="secondParentName" type="text" required className={`${inputClass} ${fieldErrors.secondParentName ? 'border-red-500' : ''}`} />
            {fieldErrors.secondParentName && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.secondParentName}</p>}
          </div>
          <div className={halfGridClass}>
            <div className="space-y-1">
              <label htmlFor="secondParentDni" className={labelClass}>DNI del tutor{requiredMark}</label>
              <input id="secondParentDni" name="secondParentDni" type="text" required className={`${inputClass} ${fieldErrors.secondParentDni ? 'border-red-500' : ''}`} />
              {fieldErrors.secondParentDni && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.secondParentDni}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="secondParentPhone" className={labelClass}>Teléfono del tutor</label>
              <input id="secondParentPhone" name="secondParentPhone" type="tel" required className={`${inputClass} ${fieldErrors.secondParentPhone ? 'border-red-500' : ''}`} />
              {fieldErrors.secondParentPhone && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.secondParentPhone}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="requesterName" className={labelClass}>Nombre y apellidos{requiredMark}</label>
        <p className="text-xs text-black/55 mt-1">De quien recibe el correo con el enlace de firma.</p>
        <input id="requesterName" name="requesterName" type="text" required className={`${inputClass} ${fieldErrors.requesterName ? 'border-red-500' : ''}`} />
        {fieldErrors.requesterName && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.requesterName}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="requesterEmail" className={labelClass}>Correo electrónico{requiredMark}</label>
        <input id="requesterEmail" name="requesterEmail" type="email" required className={`${inputClass} ${fieldErrors.requesterEmail ? 'border-red-500' : ''}`} />
        {fieldErrors.requesterEmail && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.requesterEmail}</p>}
      </div>

      <details className="border border-black/15 px-4 py-3">
        <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-black/70">
          Adulto acompañante (opcional)
        </summary>
        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <label htmlFor="companionName" className={labelClass}>Nombre y apellidos</label>
            <input id="companionName" name="companionName" type="text" className={inputClass} />
          </div>
          <div className={halfGridClass}>
            <div className="space-y-1">
              <label htmlFor="companionDni" className={labelClass}>DNI</label>
              <input id="companionDni" name="companionDni" type="text" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label htmlFor="companionPhone" className={labelClass}>Teléfono</label>
              <input id="companionPhone" name="companionPhone" type="tel" className={inputClass} />
            </div>
          </div>
        </div>
      </details>

      <div className="space-y-3 border border-black/15 px-4 py-4">
        <div>
          <p className={labelClass}>Protección de Datos</p>
          <p className="mt-1 text-sm text-black/80">Política de privacidad</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-red-500 mt-1">(Obligatorio)</p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            name="privacidad"
            type="checkbox"
            required
            className="mt-1 shrink-0"
          />
          <span className="text-sm text-black/80 leading-relaxed">
            <span className="font-semibold text-black">He leído y acepto la </span>
            <a href="/politica-de-privacidad" className="font-semibold text-black underline hover:text-[var(--color-primary)]">
              Política de Privacidad
            </a>
            <br />
            Marcando esta casilla confirmo que he leído y acepto la Política de Privacidad y consiento el tratamiento de mis datos con la finalidad de gestionar esta autorización.
          </span>
        </label>
        {fieldErrors.privacidad && <p className="text-[10px] text-red-400">{fieldErrors.privacidad}</p>}
      </div>

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
