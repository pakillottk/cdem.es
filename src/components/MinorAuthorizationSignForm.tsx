import { actions, isInputError } from 'astro:actions';
import { TURNSTILE_SITE_KEY } from 'astro:env/client';
import { useState } from 'react';
import SignaturePad from './SignaturePad';
import Turnstile from './Turnstile';
import type { MinorRecord } from '../lib/minorAuthorization';
import {
  buildMinorAuthorizationPdf,
  fetchPdfAsset,
  pdfBytesToBase64,
  signatureDataUrlToPngBytes,
} from '../lib/minorAuthorizationPdf';

export interface SignPayload {
  minorName: string;
  minorCount: number;
  minors: MinorRecord[];
  requesterName: string;
  eventName: string;
  eventDate?: string;
  entryCode?: string;
  parentName: string;
  parentDni: string;
  parentPhone?: string;
  hasSecondTutor: boolean;
  secondParentName?: string;
  secondParentDni?: string;
  secondParentPhone?: string;
  companionName?: string;
  companionDni?: string;
  companionPhone?: string;
}

interface MinorAuthorizationSignFormProps {
  token: string;
  payload: SignPayload;
}

type FormState = 'idle' | 'submitting' | 'success' | 'error';

const inputClass =
  'mt-1 w-full bg-transparent border border-black px-3 py-2 text-sm text-black outline-none focus:border-[var(--color-primary)] transition-colors';

const labelClass =
  'block text-sm sm:text-xs uppercase tracking-[0.25em] text-black/70';

function formatSignedAt(): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export default function MinorAuthorizationSignForm({
  token,
  payload,
}: MinorAuthorizationSignFormProps) {
  const {
    minorName,
    minorCount,
    eventName,
    entryCode,
    parentName,
    hasSecondTutor,
    secondParentName,
  } = payload;

  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!turnstileToken) {
      setErrorMessage('Por favor, completa la verificación de seguridad.');
      setState('error');
      return;
    }

    if (!signatureDataUrl) {
      setErrorMessage('Debes firmar dentro del recuadro.');
      setState('error');
      return;
    }

    setState('submitting');
    setFieldErrors({});
    setErrorMessage('');

    const formData = new FormData(event.currentTarget);
    const locality = String(formData.get('locality') ?? '').trim();
    const signedAt = formatSignedAt();

    let pdfBase64: string;
    try {
      const logoPng = await fetchPdfAsset(window.location.origin, '/favicon-cdem.png');
      const pdfBytes = await buildMinorAuthorizationPdf(
        {
          requesterName: payload.requesterName,
          eventName: payload.eventName,
          eventDate: payload.eventDate,
          entryCode: payload.entryCode,
          minorCount: payload.minorCount,
          minors: payload.minors,
          minorName: payload.minors[0]?.name ?? payload.minorName,
          minorBirthDate: payload.minors[0]?.birthDate ?? '',
          minorDni: payload.minors[0]?.dni,
          parentName: payload.parentName,
          parentDni: payload.parentDni,
          parentPhone: payload.parentPhone,
          hasSecondTutor: payload.hasSecondTutor,
          secondParentName: payload.secondParentName,
          secondParentDni: payload.secondParentDni,
          secondParentPhone: payload.secondParentPhone,
          companionName: payload.companionName,
          companionDni: payload.companionDni,
          companionPhone: payload.companionPhone,
          locality,
          signedAt,
          signaturePng: signatureDataUrlToPngBytes(signatureDataUrl),
        },
        logoPng,
      );
      pdfBase64 = pdfBytesToBase64(pdfBytes);
    } catch {
      setErrorMessage('No se pudo generar el documento. Inténtalo de nuevo.');
      setState('error');
      return;
    }

    formData.set('token', token);
    formData.set('signatureDataUrl', signatureDataUrl);
    formData.set('signedAt', signedAt);
    formData.set('pdfBase64', pdfBase64);
    formData.set('turnstileToken', turnstileToken);

    const { data, error } = await actions.minorAuthorizationSign(formData);

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

    if (data?.signed) {
      setState('success');
    }
  }

  if (state === 'success') {
    return (
      <div className="border-2 border-[var(--color-primary)] px-6 sm:px-8 py-10 sm:py-12 text-center space-y-4">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-[0.2em] uppercase text-black">
          Autorización firmada
        </h2>
        <p className="text-sm text-black/60 max-w-md mx-auto">
          Hemos enviado el documento firmado a tu correo. Ya puedes cerrar esta página.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="border-2 border-black px-6 sm:px-8 py-8 sm:py-10 space-y-6 font-secondary">
      <div className="rounded-md border border-black/15 bg-black/[0.03] px-4 py-3 text-sm text-black/70">
        <p><strong>Evento:</strong> {eventName}</p>
        {entryCode && <p><strong>Código de la entrada:</strong> {entryCode}</p>}
        <p><strong>{minorCount > 1 ? 'Menores' : 'Menor'}:</strong> {minorName}</p>
        <p><strong>Tutor:</strong> {parentName}</p>
        {hasSecondTutor && secondParentName && (
          <p><strong>Segundo tutor:</strong> {secondParentName}</p>
        )}
      </div>

      {state === 'error' && (
        <div className="border border-red-500/60 bg-red-500/10 px-4 py-3 text-xs text-red-400 tracking-wide">
          {errorMessage}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="parentDni" className={labelClass}>
          DNI del tutor <span className="text-red-500">(obligatorio)</span>
        </label>
        <input
          id="parentDni"
          name="parentDni"
          type="text"
          required
          autoComplete="off"
          className={`${inputClass} ${fieldErrors.parentDni ? 'border-red-500' : ''}`}
        />
        {fieldErrors.parentDni && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.parentDni}</p>}
        <p className="text-xs text-black/55 mt-1">
          Debe coincidir exactamente con el DNI del primer o segundo tutor indicado en el formulario inicial.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="locality" className={labelClass}>
          Localidad <span className="text-red-500">(obligatorio)</span>
        </label>
        <input
          id="locality"
          name="locality"
          type="text"
          required
          className={`${inputClass} ${fieldErrors.locality ? 'border-red-500' : ''}`}
        />
        {fieldErrors.locality && <p className="text-[10px] text-red-400 mt-1">{fieldErrors.locality}</p>}
      </div>

      <div className="space-y-1">
        <p className={labelClass}>
          Firma <span className="text-red-500">(obligatorio)</span>
        </p>
        <SignaturePad onChange={setSignatureDataUrl} />
        {fieldErrors.signatureDataUrl && (
          <p className="text-[10px] text-red-400 mt-1">{fieldErrors.signatureDataUrl}</p>
        )}
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
        {state === 'submitting' ? 'Confirmando…' : 'Confirmar'}
      </button>
    </form>
  );
}
