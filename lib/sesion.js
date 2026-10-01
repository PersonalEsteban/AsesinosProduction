import { generarToken, sha256 } from './codigos.js';
import { ErrorHttp } from './respuesta.js';

// __Host- obliga a Secure + Path=/ y sin Domain: la cookie no se comparte con subdominios
export const COOKIE = '__Host-sesion';

const HORAS = { admin: 8, empresa: 8, cliente: 24 * 7 };

function leerCookie(request) {
  const cabecera = request.headers.get('Cookie') || '';
  for (const parte of cabecera.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
}

const cookie = (valor, segundos) =>
  `${COOKIE}=${valor}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${segundos}`;

export const cookieBorrar = () => cookie('', 0);

// Crea la sesión y devuelve la cabecera Set-Cookie
export async function crearSesion(sql, { rol, usuarioId = null, codigoProyectoId = null }) {
  const token = generarToken();
  const horas = HORAS[rol];
  await sql`
    INSERT INTO sesiones (token_hash, usuario_id, codigo_proyecto_id, expira_en)
    VALUES (${await sha256(token)}, ${usuarioId}, ${codigoProyectoId},
            now() + make_interval(hours => ${horas}))`;
  return cookie(token, horas * 3600);
}

// Devuelve { rol, usuarioId, nombre, proyectoId, proyectoNombre } o null.
// El rol se lee del usuario en vivo: si se desactiva o cambia, aplica de inmediato.
export async function obtenerSesion(sql, request) {
  const token = leerCookie(request);
  if (!token) return null;
  const [s] = await sql`
    SELECT COALESCE(u.rol, 'cliente') AS rol,
           u.id AS usuario_id, u.nombre AS usuario_nombre,
           p.id AS proyecto_id, p.nombre AS proyecto_nombre, c.etiqueta
    FROM sesiones s
    LEFT JOIN usuarios u ON u.id = s.usuario_id
    LEFT JOIN codigos_proyecto c ON c.id = s.codigo_proyecto_id
    LEFT JOIN proyectos p ON p.id = c.proyecto_id
    WHERE s.token_hash = ${await sha256(token)}
      AND s.expira_en > now()
      AND (s.usuario_id IS NULL OR u.activo)
      AND (s.codigo_proyecto_id IS NULL OR c.activo)`;
  if (!s) return null;
  return {
    rol: s.rol,
    usuarioId: s.usuario_id,
    nombre: s.usuario_nombre ?? s.etiqueta ?? s.proyecto_nombre,
    proyectoId: s.proyecto_id,
    proyectoNombre: s.proyecto_nombre,
  };
}

export async function cerrarSesion(sql, request) {
  const token = leerCookie(request);
  if (token) await sql`DELETE FROM sesiones WHERE token_hash = ${await sha256(token)}`;
}

// Uso en endpoints: const s = await requerir(context, 'admin', 'empresa');
export async function requerir(context, ...roles) {
  const s = await context.data.sesion();
  if (!s) throw new ErrorHttp(401, 'Debes iniciar sesión.');
  if (roles.length && !roles.includes(s.rol)) throw new ErrorHttp(403, 'No tienes permiso.');
  return s;
}
