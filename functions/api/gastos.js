const PORCENTAJE_JOACO = 0.70;
const PORCENTAJE_AGUS  = 0.30;

function isAuthorized(token, envToken) {
  if (!envToken) return true; // sin secreto configurado: modo dev
  return token === envToken;
}

function ok(data = { ok: true }) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function err(message, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function calcParts(monto, categoria) {
  if (categoria === 'Pago de Saldo') return { joaco: null, agus: null };
  return {
    joaco: parseFloat((monto * PORCENTAJE_JOACO).toFixed(2)),
    agus:  parseFloat((monto * PORCENTAJE_AGUS).toFixed(2)),
  };
}

// GET /api/gastos?token=...  →  devuelve todos los gastos (newest first)
export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get('token');
  if (!isAuthorized(token, env.API_TOKEN)) return err('Unauthorized', 401);

  try {
    const { results } = await env.DB
      .prepare('SELECT * FROM gastos ORDER BY fecha DESC, id DESC')
      .all();

    return ok(results.map(r => ({
      'Fecha':               r.fecha,
      'Descripción':         r.descripcion,
      'Categoría':           r.categoria,
      'Monto Total':         r.monto_total,
      'Moneda':              r.moneda,
      'Pagado por':          r.pagado_por,
      'Mi parte':            r.parte_joaco,
      'Parte otra persona':  r.parte_agus,
      _row:                  r.id,
    })));
  } catch (e) {
    return err(e.message, 500);
  }
}

// POST /api/gastos  →  crear | editar | eliminar según data.action
export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); }
  catch { return err('JSON inválido'); }

  if (!isAuthorized(data.token, env.API_TOKEN)) return err('Unauthorized', 401);

  try {
    if (data.action === 'delete') {
      await env.DB.prepare('DELETE FROM gastos WHERE id = ?').bind(data._row).run();
      return ok();
    }

    if (data.action === 'update') {
      const monto = parseFloat(data.monto) || 0;
      const { joaco, agus } = calcParts(monto, data.categoria);
      await env.DB.prepare(`
        UPDATE gastos
        SET fecha = ?, descripcion = ?, categoria = ?, monto_total = ?,
            pagado_por = ?, parte_joaco = ?, parte_agus = ?
        WHERE id = ?
      `).bind(data.fecha, data.descripcion, data.categoria, monto,
               data.quien, joaco, agus, data._row).run();
      return ok();
    }

    // crear
    const monto = parseFloat(data.monto) || 0;
    const { joaco, agus } = calcParts(monto, data.categoria);
    await env.DB.prepare(`
      INSERT INTO gastos
        (fecha, descripcion, categoria, monto_total, moneda, pagado_por, parte_joaco, parte_agus)
      VALUES (?, ?, ?, ?, 'ARS', ?, ?, ?)
    `).bind(data.fecha, data.descripcion, data.categoria, monto,
             data.quien, joaco, agus).run();
    return ok();

  } catch (e) {
    return err(e.message, 500);
  }
}
