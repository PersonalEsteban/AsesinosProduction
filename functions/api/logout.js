// POST /api/logout
import { cerrarSesion, cookieBorrar } from '../../lib/sesion.js';
import { json } from '../../lib/respuesta.js';

export async function onRequestPost(context) {
  await cerrarSesion(context.data.db(), context.request);
  return json({ ok: true }, 200, { 'Set-Cookie': cookieBorrar() });
}
