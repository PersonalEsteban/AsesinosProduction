// POST /api/proyectos/:id/codigos  (solo admin)
//   { etiqueta? } -> crea un código de acceso de cliente (se muestra UNA vez)
import { generarCodigo, hashCodigo } from '../../../../lib/codigos.js';
import { requerir } from '../../../../lib/sesion.js';
import { json, leerJson, texto, idParam, ErrorHttp } from '../../../../lib/respuesta.js';

export async function onRequestPost(context) {
  await requerir(context, 'admin');
  const id = idParam(context.params.id);
  const datos = await leerJson(context.request);
  const etiqueta = String(datos.etiqueta ?? '').trim() ? texto(datos.etiqueta, 'etiqueta', { max: 100 }) : null;
  const sql = context.data.db();

  const [proyecto] = await sql`SELECT id FROM proyectos WHERE id = ${id}`;
  if (!proyecto) throw new ErrorHttp(404, 'Proyecto no encontrado.');

  const codigo = generarCodigo();
  const [registro] = await sql`
    INSERT INTO codigos_proyecto (proyecto_id, etiqueta, codigo_hash)
    VALUES (${id}, ${etiqueta}, ${await hashCodigo(codigo, context.env.CODE_PEPPER)})
    RETURNING id, etiqueta, activo, creado_en, ultimo_acceso`;
  return json({ ok: true, codigo: registro, valor: codigo }, 201);
}
