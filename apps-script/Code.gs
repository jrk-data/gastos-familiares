// ============================================================
//  CONFIGURACIÓN
// ============================================================
const CONFIG = {
  SPREADSHEET_ID: '1p5G1iq1E9LYki20pwfEI2ubaJW6ghAHAbBi_eG4ePCk',
  PORCENTAJE_JOACO: 0.70,
  PORCENTAJE_AGUS:  0.30,
};

// ============================================================
//  RECIBIR GASTO DESDE EL FORMULARIO WEB
// ============================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const montoTotal = parseFloat(data.monto) || 0;
    const parteJoaco = parseFloat((montoTotal * CONFIG.PORCENTAJE_JOACO).toFixed(2));
    const parteAgus  = parseFloat((montoTotal * CONFIG.PORCENTAJE_AGUS).toFixed(2));

    const ss   = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let   hoja = ss.getSheetByName('Historial');

    if (!hoja) {
      hoja = ss.insertSheet('Historial');
      const headers = ['Fecha', 'Descripción', 'Categoría', 'Monto Total', 'Moneda', 'Pagado por', 'Mi parte', 'Parte otra persona'];
      hoja.getRange(1, 1, 1, headers.length)
          .setValues([headers])
          .setFontWeight('bold');
      hoja.setFrozenRows(1);
    }

    hoja.appendRow([
      data.fecha,
      data.descripcion,
      data.categoria,
      montoTotal,
      'ARS',
      data.quien,
      parteJoaco,
      parteAgus,
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
//  DEVOLVER GASTOS AL FORMULARIO WEB
// ============================================================
function doGet() {
  const ss   = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const hoja = ss.getSheetByName('Historial');

  if (!hoja || hoja.getLastRow() < 2) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const valores = hoja.getDataRange().getValues();
  const headers = valores[0];
  const filas   = valores.slice(1).reverse().map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });

  return ContentService
    .createTextOutput(JSON.stringify(filas))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  PRUEBA MANUAL DESDE EL EDITOR
// ============================================================
function testPost() {
  doPost({
    postData: {
      contents: JSON.stringify({
        fecha:       '2026-03-29',
        descripcion: 'Supermercado Día',
        categoria:   'Alimentación',
        monto:       10000,
        quien:       'Joaco',
      }),
    },
  });
}
