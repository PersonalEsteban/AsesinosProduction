// Protege todo /app/*: sin sesión válida no se entrega ni el HTML del panel.
import { crearSql } from '../../lib/db.js';
import { obtenerSesion } from '../../lib/sesion.js';

export async function onRequest(context) {
  const { request, env } = context;
  const login = new URL('/#ingresar', request.url);

  let sql;
  try {
    sql = crearSql(env);
    if (!(await obtenerSesion(sql, request))) return Response.redirect(login, 302);
  } catch (err) {
    console.error(err);
    return Response.redirect(login, 302);
  } finally {
    if (sql) context.waitUntil(sql.end());
  }

  const res = await context.next();
  const copia = new Response(res.body, res);
  copia.headers.set('Cache-Control', 'no-store');
  return copia;
}
