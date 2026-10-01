CREATE TABLE usuarios (
  id             SERIAL PRIMARY KEY,
  nombre         TEXT        NOT NULL CHECK (length(nombre) BETWEEN 1 AND 100),
  rol            TEXT        NOT NULL CHECK (rol IN ('admin', 'empresa')),
  codigo_hash    TEXT        NOT NULL UNIQUE,
  activo         BOOLEAN     NOT NULL DEFAULT true,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_acceso  TIMESTAMPTZ
);

CREATE TABLE proyectos (
  id              SERIAL PRIMARY KEY,
  nombre          TEXT        NOT NULL CHECK (length(nombre) BETWEEN 1 AND 150),
  descripcion     TEXT        CHECK (length(descripcion) <= 2000),
  avance          SMALLINT    NOT NULL DEFAULT 0 CHECK (avance BETWEEN 0 AND 100),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE codigos_proyecto (
  id             SERIAL PRIMARY KEY,
  proyecto_id    INTEGER     NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  etiqueta       TEXT        CHECK (length(etiqueta) <= 100),  -- ej: "Cliente Juan"
  codigo_hash    TEXT        NOT NULL UNIQUE,
  activo         BOOLEAN     NOT NULL DEFAULT true,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_acceso  TIMESTAMPTZ
);
CREATE INDEX ON codigos_proyecto (proyecto_id);

CREATE TABLE avances (
  id           SERIAL PRIMARY KEY,
  proyecto_id  INTEGER     NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  usuario_id   INTEGER     REFERENCES usuarios(id) ON DELETE SET NULL,
  porcentaje   SMALLINT    NOT NULL CHECK (porcentaje BETWEEN 0 AND 100),
  descripcion  TEXT        NOT NULL CHECK (length(descripcion) BETWEEN 1 AND 2000),
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON avances (proyecto_id, creado_en DESC);

CREATE TABLE sesiones (
  token_hash          TEXT        PRIMARY KEY,
  usuario_id          INTEGER     REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo_proyecto_id  INTEGER     REFERENCES codigos_proyecto(id) ON DELETE CASCADE,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_en           TIMESTAMPTZ NOT NULL,
  CHECK ((usuario_id IS NULL) <> (codigo_proyecto_id IS NULL))
);
CREATE INDEX ON sesiones (expira_en);

CREATE TABLE intentos_login (
  id         BIGSERIAL   PRIMARY KEY,
  ip         TEXT        NOT NULL,
  exito      BOOLEAN     NOT NULL,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON intentos_login (ip, creado_en);
