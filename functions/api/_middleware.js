// Middleware de /api/*: conexión a la base bajo demanda, sesión, CSRF y errores.
import { crearSql } from '../../lib/db.js';
import { obtenerSesion } from '../../lib/sesion.js';
import { json, ErrorHttp } from '../../lib/respuesta.js';

export async function onRequest(context) {
  const { request, env } = context;

  // CSRF: solicitudes que modifican datos deben venir de este mismo sitio
  if (!['GET', 'HEAD'].includes(request.method)) {
    const origen = request.headers.get('Origin');
    if (origen && origen !== new URL(request.url).origin) {
      return json({ ok: false, error: 'Origen no permitido.' }, 403);
    }
  }

  // Se conecta solo si el endpoint lo usa (ej: /api/contacto no necesita base)
  let sql;
  let sesion;
  context.data.db = () => (sql ??= crearSql(env));
  context.data.sesion = async () => (sesion ??= obtenerSesion(context.data.db(), request));

  try {
    return await context.next();
  } catch (err) {
    if (err instanceof ErrorHttp) return json({ ok: false, error: err.message }, err.status);
    console.error(err);
    return json({ ok: false, error: 'Error interno del servidor.' }, 500);
  } finally {
    if (sql) context.waitUntil(sql.end());
  }
}
