import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro:schema';
import {
  RESEND_API_KEY,
  CONTACT_EMAIL_TO,
  FROM_EMAIL,
  TURNSTILE_SECRET_KEY,
  TURNSTILE_TEST_MODE,
  PREVIEW_SECRET,
  MINOR_AUTH_SECRET,
} from 'astro:env/server';
import {
  createMinorAuthorizationToken,
  normalizeDni,
  verifyMinorAuthorizationToken,
} from '../lib/minorAuthorization';

/**
 * En test mode, verifica que la petición lleve el secret de preview.
 * El cliente puede enviarlo como:
 *   - Cookie:  preview-token=<PREVIEW_SECRET>  (DevTools → Application → Cookies → Add)
 *   - Header:  x-preview-secret: <PREVIEW_SECRET>
 */
function verifyPreviewAccess(request: Request): void {
  const isTestMode = TURNSTILE_TEST_MODE === 'true';
  if (!isTestMode) return;

  const secret = PREVIEW_SECRET ?? '';
  if (!secret) {
    throw new ActionError({
      code: 'FORBIDDEN',
      message: 'Formulario no disponible en este entorno.',
    });
  }

  const cookie = request.headers.get('cookie') ?? '';
  const cookieVal = cookie.split(';').map(c => c.trim())
    .find(c => c.startsWith('preview-token='))?.split('=')[1] ?? '';
  const headerVal = request.headers.get('x-preview-secret') ?? '';

  if (cookieVal !== secret && headerVal !== secret) {
    throw new ActionError({ code: 'FORBIDDEN', message: 'Acceso no autorizado.' });
  }
}

// Clave secreta de test de Cloudflare: acepta cualquier token y siempre devuelve success.
// Documentada públicamente en https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(date: string | undefined): string {
  if (!date) return '';
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(date);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

function buildMinorAuthorizationRequestEmailHtml(name: string, eventName: string, link: string): string {
  const safeName = escapeHtml(name);
  const safeEventName = escapeHtml(eventName);
  const safeLink = escapeHtml(link);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Firma pendiente</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;color:#111111;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #dddddd;">
          <tr>
            <td style="padding:32px 36px;background:#000000;color:#ffffff;">
              <h1 style="margin:0;font-size:24px;">Autorización de menores</h1>
              <p style="margin:8px 0 0;font-size:14px;color:#ffffffcc;">Firma pendiente para ${safeEventName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 16px;font-size:16px;">Hola ${safeName},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">
                Hemos recibido tu solicitud. Para completar la autorización, abre el enlace de abajo y firma el documento.
              </p>
              <p style="margin:0 0 24px;">
                <a href="${safeLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:14px;font-weight:700;">
                  Abrir formulario de firma
                </a>
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#666666;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                <a href="${safeLink}" style="color:#2563eb;">${safeLink}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

interface CompletedMinorAuthorizationEmailInput {
  requesterName: string;
  eventName: string;
  eventDate?: string;
  minorName: string;
  minorBirthDate: string;
  minorDni?: string;
  parentName: string;
  parentDni: string;
  parentPhone: string;
  parentAddress?: string;
  companionName?: string;
  companionDni?: string;
  companionPhone?: string;
  locality: string;
  signedAt: string;
  signatureDataUrl: string;
}

function buildMinorAuthorizationCompletedEmailHtml(data: CompletedMinorAuthorizationEmailInput): string {
  const safe = {
    requesterName: escapeHtml(data.requesterName),
    eventName: escapeHtml(data.eventName),
    eventDate: formatDate(data.eventDate),
    minorName: escapeHtml(data.minorName),
    minorBirthDate: formatDate(data.minorBirthDate),
    minorDni: data.minorDni ? escapeHtml(data.minorDni) : '—',
    parentName: escapeHtml(data.parentName),
    parentDni: escapeHtml(data.parentDni),
    parentPhone: escapeHtml(data.parentPhone),
    parentAddress: data.parentAddress ? escapeHtml(data.parentAddress) : '—',
    companionName: data.companionName ? escapeHtml(data.companionName) : '—',
    companionDni: data.companionDni ? escapeHtml(data.companionDni) : '—',
    companionPhone: data.companionPhone ? escapeHtml(data.companionPhone) : '—',
    locality: escapeHtml(data.locality),
    signedAt: escapeHtml(data.signedAt),
    signatureDataUrl: escapeHtml(data.signatureDataUrl),
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Autorización firmada</title>
</head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111111;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="720" cellpadding="0" cellspacing="0" style="max-width:720px;width:100%;background:#ffffff;padding:40px 44px;border:1px solid #d1d5db;">
          <tr>
            <td>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
                <div>
                  <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">CDEM</p>
                  <h1 style="margin:0;font-size:34px;line-height:1.1;">Autorización de menores</h1>
                </div>
                <div style="text-align:right;">
                  <p style="margin:0;font-size:12px;color:#6b7280;">Solicitante</p>
                  <p style="margin:4px 0 0;font-size:14px;">${safe.requesterName}</p>
                </div>
              </div>
              <p style="margin:28px 0 0;font-size:16px;line-height:1.7;">
                Autorizo al menor indicado a acceder al evento <strong>${safe.eventName}</strong>${safe.eventDate ? ` el <strong>${safe.eventDate}</strong>` : ''} y acepto la responsabilidad derivada de su asistencia.
              </p>

              <h2 style="margin:34px 0 12px;font-size:20px;">1) Datos del menor</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.7;">
                <tr><td style="padding:4px 0;"><strong>Nombre y apellidos:</strong> ${safe.minorName}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Fecha de nacimiento:</strong> ${safe.minorBirthDate}</td></tr>
                <tr><td style="padding:4px 0;"><strong>DNI:</strong> ${safe.minorDni}</td></tr>
              </table>

              <h2 style="margin:30px 0 12px;font-size:20px;">2) Padre, madre o tutor legal</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.7;">
                <tr><td style="padding:4px 0;"><strong>Nombre y apellidos:</strong> ${safe.parentName}</td></tr>
                <tr><td style="padding:4px 0;"><strong>DNI:</strong> ${safe.parentDni}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Teléfono:</strong> ${safe.parentPhone}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Domicilio:</strong> ${safe.parentAddress}</td></tr>
              </table>

              <h2 style="margin:30px 0 12px;font-size:20px;">3) Adulto acompañante o custodio alternativo</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.7;">
                <tr><td style="padding:4px 0;"><strong>Nombre y apellidos:</strong> ${safe.companionName}</td></tr>
                <tr><td style="padding:4px 0;"><strong>DNI:</strong> ${safe.companionDni}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Teléfono:</strong> ${safe.companionPhone}</td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;border-top:1px solid #d1d5db;padding-top:20px;">
                <tr>
                  <td style="vertical-align:bottom;font-size:14px;">
                    En <strong>${safe.locality}</strong><br />
                    Fecha de firma: <strong>${safe.signedAt}</strong>
                  </td>
                  <td style="text-align:right;">
                    <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">Firma</p>
                    <img src="${safe.signatureDataUrl}" alt="Firma manuscrita" style="max-width:220px;max-height:110px;border-bottom:1px solid #111111;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

async function sendResendEmail(payload: Record<string, unknown>): Promise<void> {
  if (!RESEND_API_KEY || !FROM_EMAIL) {
    throw new ActionError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'El envío de correo no está configurado. Contacta con el administrador.',
    });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[Resend] ${res.status} ${res.statusText}:`, body);
    throw new ActionError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'No se pudo enviar el correo. Por favor, inténtalo de nuevo.',
    });
  }
}

function getMinorAuthSecret(): string {
  const secret = MINOR_AUTH_SECRET ?? PREVIEW_SECRET ?? '';
  if (!secret) {
    throw new ActionError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'La autorización de menores no está configurada correctamente.',
    });
  }
  return secret;
}

async function verifyTurnstile(token: string): Promise<void> {
  const secret = TURNSTILE_TEST_MODE === 'true' ? TURNSTILE_TEST_SECRET : TURNSTILE_SECRET_KEY;
  if (!secret) throw new ActionError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'El formulario de verificación no está configurado correctamente.',
  });
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
  });
  const data = await res.json() as { success: boolean };
  if (!data.success) throw new ActionError({
    code: 'FORBIDDEN',
    message: 'La verificación de seguridad ha fallado. Por favor, inténtalo de nuevo.',
  });
}

function buildEmailHtml(nombre: string, email: string, telefono: string | undefined, mensaje: string): string {
  const safeNombre = escapeHtml(nombre);
  const safeEmail = escapeHtml(email);
  const safeTelefono = telefono ? escapeHtml(telefono) : undefined;
  const safeMensaje = escapeHtml(mensaje);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nueva solicitud de contacto</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:2px solid #ffffff;">
          <!-- Cabecera -->
          <tr>
            <td style="background:linear-gradient(135deg,#06b6d4,#0ea5e9);padding:32px 40px;">
              <h1 style="margin:0;color:#000000;font-size:28px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;">CDEM</h1>
              <p style="margin:8px 0 0;color:#000000;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">Creación y Diseño de Eventos Musicales</p>
            </td>
          </tr>

          <!-- Subtítulo -->
          <tr>
            <td style="background-color:#111111;padding:24px 40px;border-bottom:1px solid #222222;">
              <h2 style="margin:0;color:#22d3ee;font-size:13px;letter-spacing:0.25em;text-transform:uppercase;">Nueva solicitud de contacto desde la web</h2>
            </td>
          </tr>

          <!-- Datos del remitente -->
          <tr>
            <td style="background-color:#000000;padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:16px;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0 0 4px;color:#ffffff80;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;">Nombre</p>
                    <p style="margin:0;color:#ffffff;font-size:15px;">${safeNombre}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0 0 4px;color:#ffffff80;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;">Email</p>
                    <p style="margin:0;color:#22d3ee;font-size:15px;">${safeEmail}</p>
                  </td>
                </tr>
                ${safeTelefono ? `
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0 0 4px;color:#ffffff80;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;">Teléfono</p>
                    <p style="margin:0;color:#ffffff;font-size:15px;">${safeTelefono}</p>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding-top:16px;">
                    <p style="margin:0 0 8px;color:#ffffff80;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;">Mensaje</p>
                    <p style="margin:0;color:#ffffff;font-size:15px;line-height:1.7;white-space:pre-wrap;">${safeMensaje}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#111111;padding:20px 40px;border-top:1px solid #222222;">
              <p style="margin:0;color:#ffffff40;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;">
                Este mensaje fue enviado desde el formulario de contacto de cdem.es &mdash; Responde directamente a este email para contactar con ${safeNombre}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export const server = {
  contact: defineAction({
    accept: 'form',
    input: z.object({
      nombre: z.string().min(1, 'El nombre es obligatorio'),
      email: z.string().email('Email no válido'),
      telefono: z.string().optional(),
      mensaje: z.string().min(1, 'El mensaje es obligatorio'),
      turnstileToken: z.string().min(1, 'Token de verificación requerido'),
    }),
    handler: async ({ nombre, email, telefono, mensaje, turnstileToken }, context) => {
      verifyPreviewAccess(context.request);
      await verifyTurnstile(turnstileToken);

      if (!RESEND_API_KEY || !CONTACT_EMAIL_TO || !FROM_EMAIL) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'El formulario de contacto no está configurado. Contacta con el administrador.',
        });
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `CDEM Web <${FROM_EMAIL}>`,
          to: [CONTACT_EMAIL_TO],
          reply_to: email,
          subject: `Nueva solicitud de contacto de ${nombre}`,
          html: buildEmailHtml(nombre, email, telefono, mensaje),
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`[Resend] ${res.status} ${res.statusText}:`, body);
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'No se pudo enviar el mensaje. Por favor, inténtalo de nuevo.',
        });
      }

      return { sent: true };
    },
  }),

  newsletter: defineAction({
    accept: 'form',
    input: z.object({
      nombre: z.string().min(1, 'El nombre es obligatorio'),
      email: z.string().email('Email no válido'),
      privacidad: z.literal('on', { error: 'Debes aceptar la política de privacidad' }),
      turnstileToken: z.string().min(1, 'Token de verificación requerido'),
    }),
    handler: async ({ nombre, email, turnstileToken }, context) => {
      verifyPreviewAccess(context.request);
      await verifyTurnstile(turnstileToken);

      if (!RESEND_API_KEY) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'La suscripción no está configurada. Contacta con el administrador.',
        });
      }
      const res = await fetch('https://api.resend.com/contacts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          first_name: nombre,
          unsubscribed: false,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`[Resend newsletter] ${res.status} ${res.statusText}:`, body);
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'No se pudo procesar la suscripción. Por favor, inténtalo de nuevo.',
        });
      }

      return { subscribed: true };
    },
  }),

  minorAuthorizationRequest: defineAction({
    accept: 'form',
    input: z.object({
      requesterName: z.string().min(1, 'El nombre del tutor es obligatorio'),
      requesterEmail: z.string().email('Email no válido'),
      eventName: z.string().min(1, 'El nombre del evento es obligatorio'),
      eventDate: z.string().optional(),
      minorName: z.string().min(1, 'El nombre del menor es obligatorio'),
      minorBirthDate: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
      minorDni: z.string().optional(),
      parentName: z.string().min(1, 'El nombre del tutor es obligatorio'),
      parentDni: z.string().min(1, 'El DNI del tutor es obligatorio'),
      parentPhone: z.string().min(1, 'El teléfono del tutor es obligatorio'),
      parentAddress: z.string().optional(),
      companionName: z.string().optional(),
      companionDni: z.string().optional(),
      companionPhone: z.string().optional(),
      turnstileToken: z.string().min(1, 'Token de verificación requerido'),
    }),
    handler: async (input, context) => {
      verifyPreviewAccess(context.request);
      await verifyTurnstile(input.turnstileToken);

      const secret = getMinorAuthSecret();
      const token = await createMinorAuthorizationToken({
        requesterName: input.requesterName,
        requesterEmail: input.requesterEmail,
        eventName: input.eventName,
        eventDate: input.eventDate,
        minorName: input.minorName,
        minorBirthDate: input.minorBirthDate,
        minorDni: input.minorDni,
        parentName: input.parentName,
        parentDni: input.parentDni,
        parentPhone: input.parentPhone,
        parentAddress: input.parentAddress,
        companionName: input.companionName,
        companionDni: input.companionDni,
        companionPhone: input.companionPhone,
      }, secret);

      const requestUrl = new URL(context.request.url);
      const signatureLink = new URL('/autorizacion-menores/firma', requestUrl.origin);
      signatureLink.searchParams.set('token', token);

      await sendResendEmail({
        from: `CDEM Web <${FROM_EMAIL}>`,
        to: [input.requesterEmail],
        ...(CONTACT_EMAIL_TO ? { bcc: [CONTACT_EMAIL_TO] } : {}),
        subject: `Firma pendiente: autorización para ${input.minorName}`,
        html: buildMinorAuthorizationRequestEmailHtml(
          input.requesterName,
          input.eventName,
          signatureLink.toString(),
        ),
      });

      return { sent: true, linkGenerated: true };
    },
  }),

  minorAuthorizationSign: defineAction({
    accept: 'form',
    input: z.object({
      token: z.string().min(1, 'Falta el enlace firmado'),
      parentDni: z.string().min(1, 'El DNI del tutor es obligatorio'),
      locality: z.string().min(1, 'La localidad es obligatoria'),
      signatureDataUrl: z.string().regex(/^data:image\/png;base64,/, 'La firma no es válida'),
      turnstileToken: z.string().min(1, 'Token de verificación requerido'),
    }),
    handler: async ({ token, parentDni, locality, signatureDataUrl, turnstileToken }, context) => {
      verifyPreviewAccess(context.request);
      await verifyTurnstile(turnstileToken);

      const secret = getMinorAuthSecret();
      const { payload } = await verifyMinorAuthorizationToken(token, secret);
      if (normalizeDni(parentDni) !== normalizeDni(payload.parentDni)) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'El DNI del tutor no coincide con el del formulario inicial.',
        });
      }
      const signedAt = new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(new Date());

      await sendResendEmail({
        from: `CDEM Web <${FROM_EMAIL}>`,
        to: CONTACT_EMAIL_TO ? [payload.requesterEmail, CONTACT_EMAIL_TO] : [payload.requesterEmail],
        reply_to: payload.requesterEmail,
        subject: `Autorización firmada: ${payload.minorName}`,
        html: buildMinorAuthorizationCompletedEmailHtml({
          requesterName: payload.requesterName,
          eventName: payload.eventName,
          eventDate: payload.eventDate,
          minorName: payload.minorName,
          minorBirthDate: payload.minorBirthDate,
          minorDni: payload.minorDni,
          parentName: payload.parentName,
          parentDni: normalizeDni(payload.parentDni),
          parentPhone: payload.parentPhone,
          parentAddress: payload.parentAddress,
          companionName: payload.companionName,
          companionDni: payload.companionDni,
          companionPhone: payload.companionPhone,
          locality,
          signedAt,
          signatureDataUrl,
        }),
      });

      return {
        signed: true,
        parentDni: normalizeDni(payload.parentDni),
      };
    },
  }),
};
