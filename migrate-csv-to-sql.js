#!/usr/bin/env node
// Convierte el CSV exportado de Google Sheets a SQL INSERTs para D1.
//
// Uso:
//   1. En Google Sheets: Archivo → Descargar → CSV (.csv)
//   2. node migrate-csv-to-sql.js Historial.csv > migration.sql
//   3. npx wrangler d1 execute gastos-db --file=migration.sql

import { readFileSync } from 'fs';
import { parse }        from 'node:readline';

const file = process.argv[2];
if (!file) { console.error('Uso: node migrate-csv-to-sql.js archivo.csv'); process.exit(1); }

const raw   = readFileSync(file, 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim());

// Cabecera: Fecha,Descripción,Categoría,Monto Total,Moneda,Pagado por,Mi parte,Parte otra persona
const rows = lines.slice(1); // saltar header

const escSql = v => v.replace(/'/g, "''");

const inserts = rows.map(line => {
  // Split respetando comillas (campos con comas dentro)
  const cols = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { cols.push(cur); cur = ''; continue; }
    cur += ch;
  }
  cols.push(cur);

  const [fecha, desc, cat, monto, moneda, quien, joaco, agus] = cols.map(c => c.trim());

  if (!fecha || !desc || !cat) return null; // fila vacía

  const montoNum = parseFloat(monto.replace(',', '.')) || 0;
  const joacoVal = joaco && joaco !== '' && joaco !== '-' ? parseFloat(joaco.replace(',', '.')) : 'NULL';
  const agusVal  = agus  && agus  !== '' && agus  !== '-' ? parseFloat(agus.replace(',',  '.')) : 'NULL';

  return `INSERT INTO gastos (fecha, descripcion, categoria, monto_total, moneda, pagado_por, parte_joaco, parte_agus) VALUES ('${escSql(fecha)}', '${escSql(desc)}', '${escSql(cat)}', ${montoNum}, '${escSql(moneda || 'ARS')}', '${escSql(quien)}', ${joacoVal}, ${agusVal});`;
}).filter(Boolean);

console.log('-- Migración generada automáticamente desde CSV de Google Sheets');
console.log(`-- ${inserts.length} registros\n`);
inserts.forEach(i => console.log(i));
