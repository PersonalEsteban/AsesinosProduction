-- Crea el PRIMER administrador (solo se usa una vez).
-- Los siguientes usuarios se crean desde el panel /app/.
--
-- 1. Reemplaza TU-CODIGO por un código largo e inventado por ti
--    (mínimo 12 letras/números, ej: K7QM-4XPR-9TWD). Los guiones y espacios
--    se ignoran y las minúsculas se tratan como mayúsculas.
-- 2. Reemplaza TU-CODE_PEPPER por el mismo valor del secret CODE_PEPPER de Cloudflare.
-- 3. Ejecuta. Luego entra a /login.html con TU-CODIGO.
--    Recomendado: después, desde el panel, regenera tu código para que lo genere el sistema.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO usuarios (nombre, rol, codigo_hash)
VALUES (
  'Administrador',
  'admin',
  encode(
    hmac(regexp_replace(upper('TU-CODIGO'), '[^A-Z0-9]', '', 'g'), 'TU-CODE_PEPPER', 'sha256'),
    'hex'
  )
);
