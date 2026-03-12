import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro:schema';
import { RESEND_API_KEY, CONTACT_EMAIL_TO, FROM_EMAIL } from 'astro:env/server';

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
    }),
    handler: async ({ nombre, email, telefono, mensaje }) => {
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
    }),
    handler: async ({ nombre, email }) => {
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
};
