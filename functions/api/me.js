// GET /api/me -> datos de la sesión actual (el panel decide qué mostrar según el rol)
import { requerir } from '../../lib/sesion.js';
import { json } from '../../lib/respuesta.js';

export async function onRequestGet(context) {
  const s = await requerir(context);
  return json({
    ok: true,
    rol: s.rol,
    usuarioId: s.usuarioId,
    nombre: s.nombre,
    proyecto: s.rol === 'cliente' ? { id: s.proyectoId, nombre: s.proyectoNombre } : null,
  });
}
