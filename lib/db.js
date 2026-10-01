import postgres from 'postgres';
import { ErrorHttp } from './respuesta.js';

// Conexión a PostgreSQL vía Hyperdrive (binding definido en wrangler.toml).
// Se crea una por solicitud; Hyperdrive mantiene el pool real de conexiones.
export function crearSql(env) {
  if (!env.HYPERDRIVE) throw new ErrorHttp(503, 'La base de datos no está configurada.');
  return postgres(env.HYPERDRIVE.connectionString, {
    max: 5,
    fetch_types: false,
  });
}
