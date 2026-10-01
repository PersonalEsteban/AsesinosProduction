// Utilidades de respuesta HTTP compartidas por las Functions

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });

// Error con código HTTP; el middleware de /api lo convierte en respuesta JSON
export class ErrorHttp extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

export async function leerJson(request) {
  if (!request.headers.get('Content-Type')?.includes('application/json')) {
    throw new ErrorHttp(415, 'Se esperaba JSON.');
  }
  try {
    return await request.json();
  } catch {
    throw new ErrorHttp(400, 'Solicitud inválida.');
  }
}

export function texto(valor, campo, { min = 1, max = 2000 } = {}) {
  const s = String(valor ?? '').trim();
  if (s.length < min || s.length > max) {
    throw new ErrorHttp(422, `El campo "${campo}" debe tener entre ${min} y ${max} caracteres.`);
  }
  return s;
}

export function idParam(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorHttp(404, 'No encontrado.');
  return id;
}
