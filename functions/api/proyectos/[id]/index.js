// GET /api/proyectos/:id -> detalle + historial de avances
//   admin y empresa: cualquier proyecto (admin además ve los códigos de acceso)
//   cliente: solo el proyecto de su código
import { requerir } from '../../../../lib/sesion.js';
import { json, idParam, ErrorHttp } from '../../../../lib/respuesta.js';

export async function onRequestGet(context) {
  const s = await requerir(context);
  const id = idParam(context.params.id);
  if (s.rol === 'cliente' && s.proyectoId !== id) throw new ErrorHttp(404, 'No encontrado.');

  const sql = context.data.db();
  const [proyecto] = await sql`
    SELECT id, nombre, descripcion, avance, creado_en, actualizado_en
    FROM proyectos WHERE id = ${id}`;
  if (!proyecto) throw new ErrorHttp(404, 'No encontrado.');

  // El cliente no necesita saber qué persona interna cargó cada avance
  const avances = s.rol === 'cliente'
    ? await sql`
        SELECT id, porcentaje, descripcion, creado_en
        FROM avances WHERE proyecto_id = ${id} ORDER BY creado_en DESC`
    : await sql`
        SELECT a.id, a.porcentaje, a.descripcion, a.creado_en, u.nombre AS autor
        FROM avances a LEFT JOIN usuarios u ON u.id = a.usuario_id
        WHERE a.proyecto_id = ${id} ORDER BY a.creado_en DESC`;

  const codigos = s.rol === 'admin'
    ? await sql`
        SELECT id, etiqueta, activo, creado_en, ultimo_acceso
        FROM codigos_proyecto WHERE proyecto_id = ${id} ORDER BY creado_en DESC`
    : undefined;

  return json({ ok: true, proyecto, avances, codigos });
}
