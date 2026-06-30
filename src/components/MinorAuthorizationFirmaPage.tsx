import { actions } from 'astro:actions';
import { useEffect, useState } from 'react';
import MinorAuthorizationSignForm, { type SignPayload } from './MinorAuthorizationSignForm';

type PageState = 'loading' | 'ready' | 'error';

export default function MinorAuthorizationFirmaPage() {
  const [state, setState] = useState<PageState>('loading');
  const [token, setToken] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [payload, setPayload] = useState<SignPayload | null>(null);

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get('token') ?? '';
    if (!urlToken) {
      setErrorMessage('Falta el enlace de firma. Abre el enlace que recibiste por correo.');
      setState('error');
      return;
    }

    setToken(urlToken);

    void actions.minorAuthorizationPayload({ token: urlToken }).then(({ data, error }) => {
      if (error) {
        setErrorMessage(error.message ?? 'El enlace no es válido.');
        setState('error');
        return;
      }
      if (data) {
        setPayload(data);
        setState('ready');
      }
    });
  }, []);

  if (state === 'loading') {
    return (
      <div className="border-2 border-black/15 px-6 py-8 text-center text-sm text-black/60">
        Comprobando enlace…
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="border-2 border-red-500/50 px-6 py-8 text-center text-sm text-red-500">
        {errorMessage}
      </div>
    );
  }

  if (!payload) return null;

  return <MinorAuthorizationSignForm token={token} payload={payload} />;
}
