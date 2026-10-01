// /api/usuarios  (solo admin)
//   GET  -> lista de usuarios internos
//   POST { nombre, rol } -> crea usuario y devuelve su código (se muestra UNA vez)
import { generarCodigo, hashCodigo } from '../../../lib/codigos.js';
import { requerir } from '../../../lib/sesion.js';
import { json, leerJson, texto, ErrorHttp } from '../../../lib/respuesta.js';

const ROLES = ['admin', 'empresa'];

export async function onRequestGet(context) {
  await requerir(context, 'admin');
  const usuarios = await context.data.db()`
    SELECT id, nombre, rol, activo, creado_en, ultimo_acceso
    FROM usuarios ORDER BY activo DESC, nombre`;
  return json({ ok: true, usuarios });
}

export async function onRequestPost(context) {
  await requerir(context, 'admin');
  const datos = await leerJson(context.request);
  const nombre = texto(datos.nombre, 'nombre', { max: 100 });
  if (!ROLES.includes(datos.rol)) throw new ErrorHttp(422, 'Rol inválido.');

  const codigo = generarCodigo();
  const [usuario] = await context.data.db()`
    INSERT INTO usuarios (nombre, rol, codigo_hash)
    VALUES (${nombre}, ${datos.rol}, ${await hashCodigo(codigo, context.env.CODE_PEPPER)})
    RETURNING id, nombre, rol, activo, creado_en, ultimo_acceso`;
  return json({ ok: true, usuario, codigo }, 201);
}
