// POST /api/proyectos/:id/avances  (admin, empresa)
//   { porcentaje: 0-100, descripcion } -> registra avance y actualiza el % del proyecto
import { requerir } from '../../../../lib/sesion.js';
import { json, leerJson, texto, idParam, ErrorHttp } from '../../../../lib/respuesta.js';

export async function onRequestPost(context) {
  const s = await requerir(context, 'admin', 'empresa');
  const id = idParam(context.params.id);
  const datos = await leerJson(context.request);
  const porcentaje = Number(datos.porcentaje);
  if (!Number.isInteger(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    throw new ErrorHttp(422, 'El porcentaje debe ser un número entero entre 0 y 100.');
  }
  const descripcion = texto(datos.descripcion, 'descripción');

  const avance = await context.data.db().begin(async (tx) => {
    const filas = await tx`
      UPDATE proyectos SET avance = ${porcentaje}, actualizado_en = now()
      WHERE id = ${id} RETURNING id`;
    if (!filas.length) throw new ErrorHttp(404, 'Proyecto no encontrado.');
    const [a] = await tx`
      INSERT INTO avances (proyecto_id, usuario_id, porcentaje, descripcion)
      VALUES (${id}, ${s.usuarioId}, ${porcentaje}, ${descripcion})
      RETURNING id, porcentaje, descripcion, creado_en`;
    return a;
  });
  return json({ ok: true, avance }, 201);
}
