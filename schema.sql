-- Gastos Familiares — D1 schema
-- Ejecutar una vez: wrangler d1 execute gastos-db --file=schema.sql
-- O pegar en el query console de Cloudflare D1

CREATE TABLE IF NOT EXISTS gastos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha       TEXT    NOT NULL,
  descripcion TEXT    NOT NULL,
  categoria   TEXT    NOT NULL,
  monto_total REAL    NOT NULL,
  moneda      TEXT    NOT NULL DEFAULT 'ARS',
  pagado_por  TEXT    NOT NULL,
  parte_joaco REAL,
  parte_agus  REAL
);
