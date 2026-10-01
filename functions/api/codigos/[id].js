// PATCH /api/codigos/:id  (solo admin)
//   { accion: 'activar' | 'desactivar' } -> habilita o revoca un código de cliente.
// Revocar cierra de inmediato las sesiones abiertas con ese código.
import { requerir } from '../../../lib/sesion.js';
import { json, leerJson, idParam, ErrorHttp } from '../../../lib/respuesta.js';

export async function onRequestPatch(context) {
  await requerir(context, 'admin');
  const id = idParam(context.params.id);
  const { accion } = await leerJson(context.request);
  if (accion !== 'activar' && accion !== 'desactivar') throw new ErrorHttp(422, 'Acción inválida.');
  const sql = context.data.db();

  const filas = await sql`
    UPDATE codigos_proyecto SET activo = ${accion === 'activar'} WHERE id = ${id} RETURNING id`;
  if (!filas.length) throw new ErrorHttp(404, 'Código no encontrado.');

  if (accion === 'desactivar') await sql`DELETE FROM sesiones WHERE codigo_proyecto_id = ${id}`;
  return json({ ok: true });
}
