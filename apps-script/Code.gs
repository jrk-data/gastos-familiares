// ============================================================
//  CONFIGURACIÓN
// ============================================================
const CONFIG = {
  SPREADSHEET_ID: '1p5G1iq1E9LYki20pwfEI2ubaJW6ghAHAbBi_eG4ePCk',
  PORCENTAJE_JOACO: 0.70,
  PORCENTAJE_AGUS:  0.30,
};

// ============================================================
//  RECIBIR ACCIÓN DESDE EL FORMULARIO WEB
// ============================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const hoja = ss.getSheetByName('Historial');

    // ── Eliminar fila ──────────────────────────────────────
    if (data.action === 'delete') {
      hoja.deleteRow(data._row);
      return ok();
    }

    // ── Editar fila ────────────────────────────────────────
    if (data.action === 'update') {
      const montoTotal = parseFloat(data.monto) || 0;
      const parteJoaco = parseFloat((montoTotal * CONFIG.PORCENTAJE_JOACO).toFixed(2));
      const parteAgus  = parseFloat((montoTotal * CONFIG.PORCENTAJE_AGUS).toFixed(2));
      hoja.getRange(data._row, 1, 1, 8).setValues([[
        data.fecha,
        data.descripcion,
        data.categoria,
        montoTotal,
        'ARS',
        data.quien,
        parteJoaco,
        parteAgus,
      ]]);
      return ok();
    }

    // ── Crear fila (comportamiento original) ───────────────
    const montoTotal = parseFloat(data.monto) || 0;
    const parteJoaco = parseFloat((montoTotal * CONFIG.PORCENTAJE_JOACO).toFixed(2));
    const parteAgus  = parseFloat((montoTotal * CONFIG.PORCENTAJE_AGUS).toFixed(2));

    let hojaDest = hoja;
    if (!hojaDest) {
      hojaDest = ss.insertSheet('Historial');
      const headers = ['Fecha', 'Descripción', 'Categoría', 'Monto Total', 'Moneda', 'Pagado por', 'Mi parte', 'Parte otra persona'];
      hojaDest.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      hojaDest.setFrozenRows(1);
    }

    hojaDest.appendRow([
      data.fecha,
      data.descripcion,
      data.categoria,
      montoTotal,
      'ARS',
      data.quien,
      parteJoaco,
      parteAgus,
    ]);

    return ok();

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ok() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  DEVOLVER GASTOS AL FORMULARIO WEB
// ============================================================
function doGet() {
  try {
    const ss   = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const hoja = ss.getSheetByName('Historial');

    if (!hoja || hoja.getLastRow() < 2) {
      return ContentService
        .createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const valores = hoja.getDataRange().getValues();
    const headers = valores[0];
    const filas   = valores.slice(1).map((row, idx) => {
      const obj = headers.reduce((o, h, i) => {
        const v = row[i];
        o[h] = v instanceof Date
          ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')
          : v;
        return o;
      }, {});
      obj._row = idx + 2; // número de fila en el sheet (1 = header, 2 = primera fila de datos)
      return obj;
    }).reverse();

    return ContentService
      .createTextOutput(JSON.stringify(filas))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('Error en doGet: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
//  PRUEBA MANUAL DESDE EL EDITOR
// ============================================================
function testPost() {
  doPost({
    postData: {
      contents: JSON.stringify({
        fecha:       '2026-03-31',
        descripcion: 'Supermercado Día',
        categoria:   'Alimentación',
        monto:       10000,
        quien:       'Joaco',
      }),
    },
  });
}
