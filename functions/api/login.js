// POST /api/login  { codigo }
// Un solo campo: el código puede ser de un usuario interno (admin/empresa)
// o un código de acceso a un proyecto (cliente).
import { hashCodigo, normalizarCodigo } from '../../lib/codigos.js';
import { crearSesion } from '../../lib/sesion.js';
import { json, leerJson } from '../../lib/respuesta.js';

const MAX_FALLIDOS = 10;   // por IP...
const VENTANA_MIN = 15;    // ...cada 15 minutos

export async function onRequestPost(context) {
  const { request, env } = context;
  const sql = context.data.db();
  const ip = request.headers.get('CF-Connecting-IP') || 'desconocida';

  const [{ fallidos }] = await sql`
    SELECT count(*)::int AS fallidos FROM intentos_login
    WHERE ip = ${ip} AND NOT exito
      AND creado_en > now() - make_interval(mins => ${VENTANA_MIN})`;
  if (fallidos >= MAX_FALLIDOS) {
    return json({ ok: false, error: 'Demasiados intentos. Espera unos minutos.' }, 429);
  }

  const { codigo } = await leerJson(request);
  let rol = null;
  let setCookie = null;

  if (normalizarCodigo(codigo).length >= 8) {
    const hash = await hashCodigo(codigo, env.CODE_PEPPER);

    const [usuario] = await sql`
      SELECT id, rol FROM usuarios WHERE codigo_hash = ${hash} AND activo`;
    if (usuario) {
      rol = usuario.rol;
      setCookie = await crearSesion(sql, { rol, usuarioId: usuario.id });
      await sql`UPDATE usuarios SET ultimo_acceso = now() WHERE id = ${usuario.id}`;
    } else {
      const [cod] = await sql`
        SELECT id FROM codigos_proyecto WHERE codigo_hash = ${hash} AND activo`;
      if (cod) {
        rol = 'cliente';
        setCookie = await crearSesion(sql, { rol, codigoProyectoId: cod.id });
        await sql`UPDATE codigos_proyecto SET ultimo_acceso = now() WHERE id = ${cod.id}`;
      }
    }
  }

  await sql`INSERT INTO intentos_login (ip, exito) VALUES (${ip}, ${rol !== null})`;
  // Limpieza de registros viejos
  await sql`DELETE FROM sesiones WHERE expira_en < now()`;
  await sql`DELETE FROM intentos_login WHERE creado_en < now() - interval '30 days'`;

  if (!rol) return json({ ok: false, error: 'Código inválido.' }, 401);
  return json({ ok: true, rol }, 200, { 'Set-Cookie': setCookie });
}
