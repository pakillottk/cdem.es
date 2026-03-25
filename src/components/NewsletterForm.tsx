import { actions, isInputError } from 'astro:actions';
import { useState } from 'react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

const inputClass = 'site-footer__input';
const smallInputClass = 'site-footer__input--small';
const labelClass = 'site-footer__label';

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
      <div className="site-footer__form">
        <p className="site-footer__label">¡Suscripción confirmada!</p>
        <p className="site-footer__bottom-text">
          Ya formas parte de nuestra newsletter. Te mantendremos informado de nuestros próximos eventos y
          producciones.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {state === 'error' && (
        <div className="site-footer__bottom-text" style={{ color: '#fca5a5' }}>
          {errorMessage}
        </div>
      )}

      <div className="site-footer__form-row">
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
      </div>

      {fieldErrors.nombre && (
        <p className="site-footer__bottom-text" style={{ color: '#fca5a5' }}>
          {fieldErrors.nombre}
        </p>
      )}

      <div className="site-footer__form-row">
        <label htmlFor="nl-email" className={labelClass}>
          Email
        </label>
        <input
          id="nl-email"
          name="email"
          type="email"
          required
          className={`${smallInputClass} ${fieldErrors.email ? 'border-red-500' : ''}`}
        />
      </div>

      {fieldErrors.email && (
        <p className="site-footer__bottom-text" style={{ color: '#fca5a5' }}>
          {fieldErrors.email}
        </p>
      )}

      <div className="site-footer__checkbox-row">
        <label className="site-footer__checkbox-label">
          <input
            name="privacidad"
            type="checkbox"
            required
            className="site-footer__checkbox"
          />
          <span className="site-footer__checkbox-text">
            Acepto la{' '}
            <a href="/politica-de-privacidad">
              política de privacidad
            </a>
          </span>
        </label>
      </div>

      {fieldErrors.privacidad && (
        <p className="site-footer__bottom-text" style={{ color: '#fca5a5' }}>
          {fieldErrors.privacidad}
        </p>
      )}

      <div className="site-footer__submit">
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="site-footer__button"
        >
          {state === 'submitting' ? 'Enviando…' : 'Suscribirse'}
        </button>
      </div>
    </form>
  );
}
