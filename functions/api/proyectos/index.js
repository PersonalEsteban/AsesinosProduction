// /api/proyectos
//   GET  (admin, empresa) -> lista de proyectos
//   POST (admin) { nombre, descripcion? } -> crea proyecto
import { requerir } from '../../../lib/sesion.js';
import { json, leerJson, texto } from '../../../lib/respuesta.js';

export async function onRequestGet(context) {
  await requerir(context, 'admin', 'empresa');
  const proyectos = await context.data.db()`
    SELECT id, nombre, descripcion, avance, creado_en, actualizado_en
    FROM proyectos ORDER BY actualizado_en DESC`;
  return json({ ok: true, proyectos });
}

export async function onRequestPost(context) {
  await requerir(context, 'admin');
  const datos = await leerJson(context.request);
  const nombre = texto(datos.nombre, 'nombre', { max: 150 });
  const descripcion = String(datos.descripcion ?? '').trim() ? texto(datos.descripcion, 'descripción') : null;

  const [proyecto] = await context.data.db()`
    INSERT INTO proyectos (nombre, descripcion) VALUES (${nombre}, ${descripcion})
    RETURNING id, nombre, descripcion, avance, creado_en, actualizado_en`;
  return json({ ok: true, proyecto }, 201);
}
