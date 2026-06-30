import { actions, isInputError } from 'astro:actions';
import { TURNSTILE_SITE_KEY } from 'astro:env/client';
import { useState } from 'react';
import Turnstile from './Turnstile';

type FormState = 'idle' | 'submitting' | 'success' | 'error';
type SiNo = 'si' | 'no';

export type EventoOption = {
  id: string;
  title: string;
  category: 'festivales' | 'conciertos';
};

type Props = {
  eventos: EventoOption[];
};

const inputClass =
  'mt-1 w-full bg-transparent border border-black px-3 py-2 text-sm text-black outline-none focus:border-[var(--color-primary)] transition-colors';

const labelClass = 'block text-sm sm:text-xs uppercase tracking-[0.25em] text-black/70';

const fieldsetClass = 'space-y-4 border border-black/20 p-5 sm:p-6';

const legendClass = 'text-base sm:text-lg font-extrabold tracking-[0.2em] uppercase text-black px-2';

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? ' *' : ''}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-500 tracking-wide mt-1">{error}</p>}
    </div>
  );
}

function MinorFields({
  index,
  required,
  fieldErrors,
}: {
  index: number;
  required: boolean;
  fieldErrors: Record<string, string>;
}) {
  const prefix = `menor${index}`;

  return (
    <fieldset className={fieldsetClass}>
      <legend className={legendClass}>Menor {index}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${prefix}Nombre`} label={`Nombre y apellidos (menor ${index})`} required={required} error={fieldErrors[`${prefix}Nombre`]}>
          <input
            id={`${prefix}Nombre`}
            name={`${prefix}Nombre`}
            type="text"
            required={required}
            className={`${inputClass} ${fieldErrors[`${prefix}Nombre`] ? 'border-red-500' : ''}`}
          />
        </Field>
        <Field
          id={`${prefix}FechaNacimiento`}
          label={`Fecha de nacimiento (menor ${index})`}
          required={required}
          error={fieldErrors[`${prefix}FechaNacimiento`]}
        >
          <input
            id={`${prefix}FechaNacimiento`}
            name={`${prefix}FechaNacimiento`}
            type="date"
            required={required}
            className={`${inputClass} ${fieldErrors[`${prefix}FechaNacimiento`] ? 'border-red-500' : ''}`}
          />
        </Field>
        <Field id={`${prefix}Dni`} label={`DNI (menor ${index})`} error={fieldErrors[`${prefix}Dni`]}>
          <input id={`${prefix}Dni`} name={`${prefix}Dni`} type="text" className={inputClass} />
        </Field>
        <Field id={`${prefix}Telefono`} label={`Teléfono (menor ${index})`} error={fieldErrors[`${prefix}Telefono`]}>
          <input id={`${prefix}Telefono`} name={`${prefix}Telefono`} type="tel" className={inputClass} />
        </Field>
      </div>
    </fieldset>
  );
}

function PersonFields({
  prefix,
  title,
  requiredEmail = true,
  fieldErrors,
}: {
  prefix: string;
  title: string;
  requiredEmail?: boolean;
  fieldErrors: Record<string, string>;
}) {
  return (
    <fieldset className={fieldsetClass}>
      <legend className={legendClass}>{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${prefix}Nombre`} label="Nombre y apellidos" required error={fieldErrors[`${prefix}Nombre`]}>
          <input
            id={`${prefix}Nombre`}
            name={`${prefix}Nombre`}
            type="text"
            required
            className={`${inputClass} ${fieldErrors[`${prefix}Nombre`] ? 'border-red-500' : ''}`}
          />
        </Field>
        <Field id={`${prefix}Dni`} label="DNI" required error={fieldErrors[`${prefix}Dni`]}>
          <input
            id={`${prefix}Dni`}
            name={`${prefix}Dni`}
            type="text"
            required
            className={`${inputClass} ${fieldErrors[`${prefix}Dni`] ? 'border-red-500' : ''}`}
          />
        </Field>
        <Field id={`${prefix}Telefono`} label="Teléfono" error={fieldErrors[`${prefix}Telefono`]}>
          <input id={`${prefix}Telefono`} name={`${prefix}Telefono`} type="tel" className={inputClass} />
        </Field>
        <Field id={`${prefix}Email`} label="Email" required={requiredEmail} error={fieldErrors[`${prefix}Email`]}>
          <input
            id={`${prefix}Email`}
            name={`${prefix}Email`}
            type="email"
            required={requiredEmail}
            className={`${inputClass} ${fieldErrors[`${prefix}Email`] ? 'border-red-500' : ''}`}
          />
        </Field>
        <Field id={`${prefix}Domicilio`} label="Domicilio" error={fieldErrors[`${prefix}Domicilio`]}>
          <input id={`${prefix}Domicilio`} name={`${prefix}Domicilio`} type="text" className={`${inputClass} sm:col-span-2`} />
        </Field>
        {prefix === 'tutor1' && (
          <Field id={`${prefix}CodigoEntrada`} label="Código de entrada" error={fieldErrors[`${prefix}CodigoEntrada`]}>
            <input id={`${prefix}CodigoEntrada`} name={`${prefix}CodigoEntrada`} type="text" className={inputClass} />
          </Field>
        )}
        {prefix === 'acompanante' && (
          <Field id={`${prefix}CodigoEntrada`} label="Código de entrada" error={fieldErrors[`${prefix}CodigoEntrada`]}>
            <input id={`${prefix}CodigoEntrada`} name={`${prefix}CodigoEntrada`} type="text" className={inputClass} />
          </Field>
        )}
      </div>
    </fieldset>
  );
}

export default function MinorAuthorizationForm({ eventos }: Props) {
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState('');
  const [numeroMenores, setNumeroMenores] = useState(1);
  const [acompananteDistinto, setAcompananteDistinto] = useState<SiNo>('no');
  const [segundoTutor, setSegundoTutor] = useState<SiNo>('no');

  const festivales = eventos.filter((evento) => evento.category === 'festivales');
  const conciertos = eventos.filter((evento) => evento.category === 'conciertos');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!turnstileToken) {
      setErrorMessage('Por favor, completa la verificación de seguridad.');
      setState('error');
      return;
    }

    setState('submitting');
    setFieldErrors({});
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);
    formData.set('turnstileToken', turnstileToken);
    formData.set('numeroMenores', String(numeroMenores));
    formData.set('acompananteDistinto', acompananteDistinto);
    formData.set('segundoTutor', segundoTutor);

    const { data, error } = await actions.minorAuthorization(formData);

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
      <div className="border-2 border-[var(--color-primary)] px-6 sm:px-8 py-10 sm:py-12 flex flex-col items-center justify-center gap-4 text-center min-h-[360px] font-secondary">
        <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
          <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg sm:text-xl font-extrabold tracking-[0.2em] uppercase text-black">
          Autorización enviada
        </h2>
        <p className="text-sm text-black/60 max-w-md">
          Hemos recibido la autorización de menores. Guarda una copia del correo de confirmación si lo recibes.
        </p>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="mt-2 inline-flex items-center justify-center rounded-full border border-black px-8 py-2.5 text-xs tracking-[0.25em] uppercase text-black hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
        >
          Enviar otra autorización
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="border-2 border-black px-6 sm:px-8 py-8 sm:py-10 space-y-8 font-secondary"
    >
      {state === 'error' && (
        <div className="border border-red-500/60 bg-red-500/10 px-4 py-3 text-xs text-red-600 tracking-wide">
          {errorMessage}
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-[0.2em] uppercase text-black">
          Datos del evento
        </h2>

        <Field id="evento" label="Evento" required error={fieldErrors.evento}>
          <select
            id="evento"
            name="evento"
            required
            defaultValue=""
            className={`${inputClass} ${fieldErrors.evento ? 'border-red-500' : ''}`}
          >
            <option value="" disabled>
              Selecciona un evento
            </option>
            {festivales.length > 0 && (
              <optgroup label="Festivales">
                {festivales.map((evento) => (
                  <option key={evento.id} value={evento.title}>
                    {evento.title}
                  </option>
                ))}
              </optgroup>
            )}
            {conciertos.length > 0 && (
              <optgroup label="Conciertos">
                {conciertos.map((evento) => (
                  <option key={evento.id} value={evento.title}>
                    {evento.title}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </Field>

        <Field id="numeroMenores" label="Número de menores" required error={fieldErrors.numeroMenores}>
          <select
            id="numeroMenores"
            name="numeroMenores"
            required
            value={numeroMenores}
            onChange={(e) => setNumeroMenores(Number(e.target.value))}
            className={inputClass}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </Field>

        <fieldset className="space-y-3">
          <legend className={labelClass}>¿El menor irá con un acompañante distinto del tutor? *</legend>
          <label className="flex items-center gap-2 text-sm text-black/80">
            <input
              type="radio"
              name="acompananteDistinto"
              value="no"
              checked={acompananteDistinto === 'no'}
              onChange={() => setAcompananteDistinto('no')}
            />
            No
          </label>
          <label className="flex items-center gap-2 text-sm text-black/80">
            <input
              type="radio"
              name="acompananteDistinto"
              value="si"
              checked={acompananteDistinto === 'si'}
              onChange={() => setAcompananteDistinto('si')}
            />
            Sí
          </label>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className={labelClass}>¿Hay un segundo tutor que autoriza? *</legend>
          <label className="flex items-center gap-2 text-sm text-black/80">
            <input
              type="radio"
              name="segundoTutor"
              value="no"
              checked={segundoTutor === 'no'}
              onChange={() => setSegundoTutor('no')}
            />
            No
          </label>
          <label className="flex items-center gap-2 text-sm text-black/80">
            <input
              type="radio"
              name="segundoTutor"
              value="si"
              checked={segundoTutor === 'si'}
              onChange={() => setSegundoTutor('si')}
            />
            Sí
          </label>
        </fieldset>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-[0.2em] uppercase text-black">Menores</h2>
        {Array.from({ length: numeroMenores }, (_, index) => (
          <MinorFields key={index + 1} index={index + 1} required fieldErrors={fieldErrors} />
        ))}
      </div>

      <div className="space-y-6">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-[0.2em] uppercase text-black">Tutor</h2>
        <PersonFields prefix="tutor1" title="Tutor / madre / padre / tutor legal" fieldErrors={fieldErrors} />
      </div>

      {acompananteDistinto === 'si' && (
        <div className="space-y-6">
          <h2 className="text-lg sm:text-xl font-extrabold tracking-[0.2em] uppercase text-black">Acompañante</h2>
          <PersonFields prefix="acompanante" title="Acompañante" fieldErrors={fieldErrors} />
        </div>
      )}

      {segundoTutor === 'si' && (
        <div className="space-y-6">
          <h2 className="text-lg sm:text-xl font-extrabold tracking-[0.2em] uppercase text-black">Segundo tutor</h2>
          <PersonFields prefix="tutor2" title="Segundo tutor" fieldErrors={fieldErrors} />
        </div>
      )}

      <fieldset className={`${fieldsetClass} space-y-4`}>
        <legend className={legendClass}>Protección de datos</legend>

        <label className="flex items-start gap-3 text-sm text-black/80">
          <input name="privacidad" type="checkbox" required className="mt-1" />
          <span>
            He leído y acepto la{' '}
            <a href="/politica-de-privacidad" className="underline hover:text-[var(--color-primary)]">
              Política de Privacidad
            </a>{' '}
            y consiento el tratamiento de mis datos para gestionar esta autorización. *
          </span>
        </label>
        {fieldErrors.privacidad && (
          <p className="text-[10px] text-red-500 tracking-wide">{fieldErrors.privacidad}</p>
        )}

        <label className="flex items-start gap-3 text-sm text-black/80">
          <input name="marketingCdem" type="checkbox" className="mt-1" />
          <span>Acepto recibir información comercial de CDEM.</span>
        </label>
      </fieldset>

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
        className="inline-flex items-center justify-center rounded-full border border-black px-10 py-2.5 text-sm sm:text-base tracking-[0.25em] uppercase text-black hover:bg-[var(--color-primary)] hover:text-black hover:border-[var(--color-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === 'submitting' ? 'Enviando…' : 'Enviar autorización'}
      </button>
    </form>
  );
}
