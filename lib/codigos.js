import { ErrorHttp } from './respuesta.js';

// Sin 0/O, 1/I/L para que los códigos no se confundan al leerlos o dictarlos
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LARGO = 12; // 31^12 ≈ 2^59 combinaciones

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

// Ignora guiones, espacios y mayúsculas/minúsculas. Debe coincidir con db/crear-admin.sql
export const normalizarCodigo = (codigo) => String(codigo ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Genera un código como "K7QM-4XPR-9TWD" (sin sesgo: descarta bytes fuera de rango)
export function generarCodigo() {
  const limite = 256 - (256 % ALFABETO.length);
  let out = '';
  while (out.length < LARGO) {
    for (const b of crypto.getRandomValues(new Uint8Array(LARGO * 2))) {
      if (b < limite && out.length < LARGO) out += ALFABETO[b % ALFABETO.length];
    }
  }
  return out.match(/.{4}/g).join('-');
}

// HMAC-SHA256(códigoNormalizado, CODE_PEPPER) en hex. Es lo único que se guarda en la base.
export async function hashCodigo(codigo, pepper) {
  if (!pepper) throw new ErrorHttp(503, 'Falta configurar CODE_PEPPER.');
  const enc = new TextEncoder();
  const clave = await crypto.subtle.importKey(
    'raw', enc.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return hex(await crypto.subtle.sign('HMAC', clave, enc.encode(normalizarCodigo(codigo))));
}

// Token de sesión aleatorio (va en la cookie) y su hash (va en la base)
export function generarToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256(texto) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
}
