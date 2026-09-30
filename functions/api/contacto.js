// Cloudflare Pages Function: equivale a un contacto.php
// Ruta: POST https://asesinos.cl/api/contacto
//
// Variables de entorno (Cloudflare > tu proyecto Pages > Settings > Variables and Secrets):
//   RESEND_API_KEY  -> API key de https://resend.com (plan gratis)       [Secret]
//   CONTACT_TO      -> correo donde quieres recibir los mensajes
//   CONTACT_FROM    -> remitente, ej: "asesinos.cl <contacto@asesinos.cl>"
//                      (requiere verificar el dominio en Resend; mientras
//                       tanto usa "asesinos.cl <onboarding@resend.dev>")

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

const escapar = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

export async function onRequestPost({ request, env }) {
  let datos;
  try {
    datos = await request.json();
  } catch {
    return json({ ok: false, error: 'Solicitud inválida.' }, 400);
  }

  // Honeypot: si un bot llenó el campo oculto, fingimos éxito y no enviamos nada
  if (datos.website) return json({ ok: true });

  const nombre = String(datos.nombre || '').trim().slice(0, 100);
  const email = String(datos.email || '').trim().slice(0, 150);
  const mensaje = String(datos.mensaje || '').trim().slice(0, 2000);

  if (!nombre || !mensaje || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'Revisa los datos ingresados.' }, 422);
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO) {
    return json({ ok: false, error: 'El formulario aún no está configurado.' }, 503);
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM || 'asesinos.cl <onboarding@resend.dev>',
      to: [env.CONTACT_TO],
      reply_to: email,
      subject: `Contacto asesinos.cl: ${nombre}`,
      html: `<p><strong>Nombre:</strong> ${escapar(nombre)}</p>
             <p><strong>Correo:</strong> ${escapar(email)}</p>
             <p><strong>Mensaje:</strong><br>${escapar(mensaje).replace(/\n/g, '<br>')}</p>`,
    }),
  });

  if (!res.ok) {
    return json({ ok: false, error: 'No se pudo enviar. Intenta más tarde.' }, 502);
  }

  return json({ ok: true });
}

// Cualquier otro método (GET, etc.) -> 405
export const onRequest = () => json({ ok: false, error: 'Método no permitido.' }, 405);
