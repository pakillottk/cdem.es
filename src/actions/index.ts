import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro:schema';
import { RESEND_API_KEY, CONTACT_EMAIL_TO, FROM_EMAIL, TURNSTILE_SECRET_KEY, TURNSTILE_TEST_MODE, PREVIEW_SECRET } from 'astro:env/server';

/**
 * En test mode, verifica que la petición lleve el secret de preview.
 * El cliente puede enviarlo como:
 *   - Cookie:  preview-token=<PREVIEW_SECRET>  (DevTools → Application → Cookies → Add)
 *   - Header:  x-preview-secret: <PREVIEW_SECRET>
 */
function verifyPreviewAccess(request: Request): void {
  const isTestMode = TURNSTILE_TEST_MODE === 'true';
  const secret = PREVIEW_SECRET ?? '';
  if (!isTestMode || !secret) return;

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

const siNoSchema = z.enum(['si', 'no']);

const minorAuthorizationSchema = z
  .object({
    evento: z.string().min(1, 'El evento es obligatorio'),
    numeroMenores: z.coerce.number().min(1).max(3),
    acompananteDistinto: siNoSchema,
    segundoTutor: siNoSchema,
    menor1Nombre: z.string().min(1, 'El nombre del menor 1 es obligatorio'),
    menor1FechaNacimiento: z.string().min(1, 'La fecha de nacimiento del menor 1 es obligatoria'),
    menor1Dni: z.string().optional(),
    menor1Telefono: z.string().optional(),
    menor2Nombre: z.string().optional(),
    menor2FechaNacimiento: z.string().optional(),
    menor2Dni: z.string().optional(),
    menor2Telefono: z.string().optional(),
    menor3Nombre: z.string().optional(),
    menor3FechaNacimiento: z.string().optional(),
    menor3Dni: z.string().optional(),
    menor3Telefono: z.string().optional(),
    tutor1Nombre: z.string().min(1, 'El nombre del tutor es obligatorio'),
    tutor1Dni: z.string().min(1, 'El DNI del tutor es obligatorio'),
    tutor1Telefono: z.string().optional(),
    tutor1Email: z.string().email('Email del tutor no válido'),
    tutor1Domicilio: z.string().optional(),
    tutor1CodigoEntrada: z.string().optional(),
    acompananteNombre: z.string().optional(),
    acompananteDni: z.string().optional(),
    acompananteTelefono: z.string().optional(),
    acompananteEmail: z.string().optional(),
    acompananteDomicilio: z.string().optional(),
    acompananteCodigoEntrada: z.string().optional(),
    tutor2Nombre: z.string().optional(),
    tutor2Dni: z.string().optional(),
    tutor2Telefono: z.string().optional(),
    tutor2Email: z.string().optional(),
    tutor2Domicilio: z.string().optional(),
    privacidad: z.literal('on', { error: 'Debes aceptar la política de privacidad' }),
    marketingCdem: z.string().optional(),
    turnstileToken: z.string().min(1, 'Token de verificación requerido'),
  })
  .superRefine((data, ctx) => {
    for (let i = 2; i <= data.numeroMenores; i++) {
      const nombre = data[`menor${i}Nombre` as 'menor2Nombre' | 'menor3Nombre'];
      const fecha = data[`menor${i}FechaNacimiento` as 'menor2FechaNacimiento' | 'menor3FechaNacimiento'];
      if (!nombre?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: [`menor${i}Nombre`],
          message: `El nombre del menor ${i} es obligatorio`,
        });
      }
      if (!fecha?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: [`menor${i}FechaNacimiento`],
          message: `La fecha de nacimiento del menor ${i} es obligatoria`,
        });
      }
    }

    if (data.acompananteDistinto === 'si') {
      if (!data.acompananteNombre?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['acompananteNombre'], message: 'El nombre del acompañante es obligatorio' });
      }
      if (!data.acompananteDni?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['acompananteDni'], message: 'El DNI del acompañante es obligatorio' });
      }
      if (!data.acompananteEmail?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['acompananteEmail'], message: 'El email del acompañante es obligatorio' });
      } else if (!z.string().email().safeParse(data.acompananteEmail).success) {
        ctx.addIssue({ code: 'custom', path: ['acompananteEmail'], message: 'Email del acompañante no válido' });
      }
    }

    if (data.segundoTutor === 'si') {
      if (!data.tutor2Nombre?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['tutor2Nombre'], message: 'El nombre del segundo tutor es obligatorio' });
      }
      if (!data.tutor2Dni?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['tutor2Dni'], message: 'El DNI del segundo tutor es obligatorio' });
      }
      if (!data.tutor2Email?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['tutor2Email'], message: 'El email del segundo tutor es obligatorio' });
      } else if (!z.string().email().safeParse(data.tutor2Email).success) {
        ctx.addIssue({ code: 'custom', path: ['tutor2Email'], message: 'Email del segundo tutor no válido' });
      }
    }
  });

type MinorAuthorizationData = z.infer<typeof minorAuthorizationSchema>;

function emailRow(label: string, value: string | undefined): string {
  if (!value?.trim()) return '';
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;">
        <p style="margin:0 0 4px;color:#ffffff80;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;">${escapeHtml(label)}</p>
        <p style="margin:0;color:#ffffff;font-size:15px;">${escapeHtml(value)}</p>
      </td>
    </tr>
  `;
}

function buildMinorAuthorizationEmailHtml(data: MinorAuthorizationData, eventoTitle: string): string {
  const minors = Array.from({ length: data.numeroMenores }, (_, index) => {
    const i = index + 1;
    const nombre = data[`menor${i}Nombre` as 'menor1Nombre' | 'menor2Nombre' | 'menor3Nombre'];
    const fecha = data[`menor${i}FechaNacimiento` as 'menor1FechaNacimiento' | 'menor2FechaNacimiento' | 'menor3FechaNacimiento'];
    const dni = data[`menor${i}Dni` as 'menor1Dni' | 'menor2Dni' | 'menor3Dni'];
    const telefono = data[`menor${i}Telefono` as 'menor1Telefono' | 'menor2Telefono' | 'menor3Telefono'];
    return `
      <tr>
        <td style="padding:16px 0 4px;border-bottom:1px solid #1a1a1a;">
          <p style="margin:0;color:#22d3ee;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;">Menor ${i}</p>
        </td>
      </tr>
      ${emailRow('Nombre', nombre)}
      ${emailRow('Fecha de nacimiento', fecha)}
      ${emailRow('DNI', dni)}
      ${emailRow('Teléfono', telefono)}
    `;
  }).join('');

  const acompananteBlock =
    data.acompananteDistinto === 'si'
      ? `
        <tr><td style="padding-top:8px;"><p style="margin:0 0 8px;color:#22d3ee;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;">Acompañante</p></td></tr>
        ${emailRow('Nombre', data.acompananteNombre)}
        ${emailRow('DNI', data.acompananteDni)}
        ${emailRow('Teléfono', data.acompananteTelefono)}
        ${emailRow('Email', data.acompananteEmail)}
        ${emailRow('Domicilio', data.acompananteDomicilio)}
        ${emailRow('Código de entrada', data.acompananteCodigoEntrada)}
      `
      : '';

  const tutor2Block =
    data.segundoTutor === 'si'
      ? `
        <tr><td style="padding-top:8px;"><p style="margin:0 0 8px;color:#22d3ee;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;">Segundo tutor</p></td></tr>
        ${emailRow('Nombre', data.tutor2Nombre)}
        ${emailRow('DNI', data.tutor2Dni)}
        ${emailRow('Teléfono', data.tutor2Telefono)}
        ${emailRow('Email', data.tutor2Email)}
        ${emailRow('Domicilio', data.tutor2Domicilio)}
      `
      : '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nueva autorización de menores</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:2px solid #ffffff;">
          <tr>
            <td style="background:linear-gradient(135deg,#06b6d4,#0ea5e9);padding:32px 40px;">
              <h1 style="margin:0;color:#000000;font-size:28px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;">CDEM</h1>
              <p style="margin:8px 0 0;color:#000000;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">Autorización de menores</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#111111;padding:24px 40px;border-bottom:1px solid #222222;">
              <h2 style="margin:0;color:#22d3ee;font-size:13px;letter-spacing:0.25em;text-transform:uppercase;">Nueva solicitud desde la web</h2>
            </td>
          </tr>
          <tr>
            <td style="background-color:#000000;padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${emailRow('Evento', eventoTitle)}
                ${emailRow('Número de menores', String(data.numeroMenores))}
                ${emailRow('Acompañante distinto del tutor', data.acompananteDistinto === 'si' ? 'Sí' : 'No')}
                ${emailRow('Segundo tutor autoriza', data.segundoTutor === 'si' ? 'Sí' : 'No')}
                ${emailRow('Marketing CDEM', data.marketingCdem === 'on' ? 'Sí' : 'No')}
                ${minors}
                <tr><td style="padding-top:8px;"><p style="margin:0 0 8px;color:#22d3ee;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;">Tutor principal</p></td></tr>
                ${emailRow('Nombre', data.tutor1Nombre)}
                ${emailRow('DNI', data.tutor1Dni)}
                ${emailRow('Teléfono', data.tutor1Telefono)}
                ${emailRow('Email', data.tutor1Email)}
                ${emailRow('Domicilio', data.tutor1Domicilio)}
                ${emailRow('Código de entrada', data.tutor1CodigoEntrada)}
                ${acompananteBlock}
                ${tutor2Block}
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#111111;padding:20px 40px;border-top:1px solid #222222;">
              <p style="margin:0;color:#ffffff40;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;">
                Enviado desde el formulario de autorización de menores de cdem.es
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

function buildEmailHtml(nombre: string, email: string, telefono: string | undefined, mensaje: string): string {
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
                    <p style="margin:0;color:#ffffff;font-size:15px;">${nombre}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0 0 4px;color:#ffffff80;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;">Email</p>
                    <p style="margin:0;color:#22d3ee;font-size:15px;">${email}</p>
                  </td>
                </tr>
                ${telefono ? `
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0 0 4px;color:#ffffff80;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;">Teléfono</p>
                    <p style="margin:0;color:#ffffff;font-size:15px;">${telefono}</p>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding-top:16px;">
                    <p style="margin:0 0 8px;color:#ffffff80;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;">Mensaje</p>
                    <p style="margin:0;color:#ffffff;font-size:15px;line-height:1.7;white-space:pre-wrap;">${mensaje}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#111111;padding:20px 40px;border-top:1px solid #222222;">
              <p style="margin:0;color:#ffffff40;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;">
                Este mensaje fue enviado desde el formulario de contacto de cdem.es &mdash; Responde directamente a este email para contactar con ${nombre}.
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

  minorAuthorization: defineAction({
    accept: 'form',
    input: minorAuthorizationSchema,
    handler: async (input, context) => {
      verifyPreviewAccess(context.request);
      await verifyTurnstile(input.turnstileToken);

      if (!RESEND_API_KEY || !CONTACT_EMAIL_TO || !FROM_EMAIL) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'El formulario no está configurado. Contacta con el administrador.',
        });
      }

      const eventoTitle = input.evento;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `CDEM Web <${FROM_EMAIL}>`,
          to: [CONTACT_EMAIL_TO],
          reply_to: input.tutor1Email,
          subject: `Autorización de menores: ${eventoTitle}`,
          html: buildMinorAuthorizationEmailHtml(input, eventoTitle),
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`[Resend minorAuthorization] ${res.status} ${res.statusText}:`, body);
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'No se pudo enviar la autorización. Por favor, inténtalo de nuevo.',
        });
      }

      return { sent: true };
    },
  }),
};
