// PATCH /api/usuarios/:id  (solo admin)
//   { accion: 'activar' | 'desactivar' | 'regenerar' }
// Desactivar o regenerar cierra todas las sesiones abiertas de ese usuario.
import { generarCodigo, hashCodigo } from '../../../lib/codigos.js';
import { requerir } from '../../../lib/sesion.js';
import { json, leerJson, idParam, ErrorHttp } from '../../../lib/respuesta.js';

export async function onRequestPatch(context) {
  const s = await requerir(context, 'admin');
  const id = idParam(context.params.id);
  const { accion } = await leerJson(context.request);
  const sql = context.data.db();

  if (id === s.usuarioId && accion === 'desactivar') {
    throw new ErrorHttp(422, 'No puedes desactivarte a ti mismo.');
  }

  let codigo = null;
  let filas;
  if (accion === 'activar' || accion === 'desactivar') {
    filas = await sql`
      UPDATE usuarios SET activo = ${accion === 'activar'} WHERE id = ${id} RETURNING id`;
  } else if (accion === 'regenerar') {
    codigo = generarCodigo();
    filas = await sql`
      UPDATE usuarios SET codigo_hash = ${await hashCodigo(codigo, context.env.CODE_PEPPER)}
      WHERE id = ${id} RETURNING id`;
  } else {
    throw new ErrorHttp(422, 'Acción inválida.');
  }
  if (!filas.length) throw new ErrorHttp(404, 'Usuario no encontrado.');

  if (accion !== 'activar') await sql`DELETE FROM sesiones WHERE usuario_id = ${id}`;
  return json({ ok: true, codigo });
}
