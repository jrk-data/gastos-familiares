// ============================================================
//  CONFIGURACIÓN — completá estos valores antes de ejecutar
// ============================================================
const CONFIG = {
  API_KEY:      'wkzK9ZXBBQS7JclHSyiLleFQ6lK9nKIkON8wNK6R',   // tu API key de Splitwise
  GROUP_ID:     '95469145',  // ver instrucciones abajo
  SPREADSHEET_ID: '1p5G1iq1E9LYki20pwfEI2ubaJW6ghAHAbBi_eG4ePCk',
  MONEDA:       'ARS',
};

// ============================================================
//  FUNCIÓN PRINCIPAL — corre manualmente o con trigger diario
// ============================================================
function syncSplitwise() {
  const gastos = obtenerGastos();
  if (!gastos || gastos.length === 0) {
    Logger.log('No se encontraron gastos.');
    return;
  }
  escribirHistorial(gastos);
  actualizarResumen(gastos);
  actualizarDivision();
  Logger.log('Sync completado: ' + gastos.length + ' gastos procesados.');
}

// ============================================================
//  OBTENER GASTOS DESDE SPLITWISE
// ============================================================
function obtenerGastos() {
  const url = `https://secure.splitwise.com/api/v3.0/get_expenses?group_id=${CONFIG.GROUP_ID}&limit=500`;
  const options = {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + CONFIG.API_KEY },
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());

  if (!data.expenses) {
    Logger.log('Error de API: ' + response.getContentText());
    return [];
  }

  // Filtrar solo gastos reales (excluir pagos/settlements)
  return data.expenses.filter(e => !e.payment && e.deleted_at === null);
}

// ============================================================
//  ESCRIBIR EN HOJA "Historial"
// ============================================================
function escribirHistorial(gastos) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let hoja = ss.getSheetByName('Historial');
  if (!hoja) hoja = ss.insertSheet('Historial');

  // Encabezados
  const headers = ['ID', 'Fecha', 'Descripción', 'Categoría', 'Monto Total', 'Moneda', 'Pagado por', 'Mi parte', 'Parte otra persona'];
  hoja.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');

  // Limpiar datos anteriores (sin tocar encabezados)
  const lastRow = hoja.getLastRow();
  if (lastRow > 1) hoja.getRange(2, 1, lastRow - 1, headers.length).clearContent();

  // Escribir filas
  const filas = gastos.map(e => {
    const pagadoPor = e.created_by ? e.created_by.first_name : 'Desconocido';
    const miParte = e.users && e.users[0] ? parseFloat(e.users[0].owed_share) : 0;
    const otraParte = e.users && e.users[1] ? parseFloat(e.users[1].owed_share) : 0;

    return [
      e.id,
      e.date ? e.date.substring(0, 10) : '',
      e.description || '',
      e.category ? e.category.name : 'Sin categoría',
      parseFloat(e.cost) || 0,
      e.currency_code || CONFIG.MONEDA,
      pagadoPor,
      miParte,
      otraParte,
    ];
  });

  if (filas.length > 0) {
    hoja.getRange(2, 1, filas.length, headers.length).setValues(filas);
  }

  // Formato de fecha y moneda
  hoja.getRange(2, 2, filas.length, 1).setNumberFormat('yyyy-mm-dd');
  hoja.getRange(2, 5, filas.length, 1).setNumberFormat('#,##0.00');
  hoja.autoResizeColumns(1, headers.length);

  Logger.log('Historial actualizado: ' + filas.length + ' filas.');
}

// ============================================================
//  ACTUALIZAR HOJA "Resumen" (totales por categoría y mes)
// ============================================================
function actualizarResumen(gastos) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let hoja = ss.getSheetByName('Resumen');
  if (!hoja) hoja = ss.insertSheet('Resumen');
  hoja.clearContents();

  // Agrupar por categoría
  const porCategoria = {};
  const porMes = {};

  gastos.forEach(e => {
    const cat = e.category ? e.category.name : 'Sin categoría';
    const monto = parseFloat(e.cost) || 0;
    const mes = e.date ? e.date.substring(0, 7) : 'Sin fecha'; // YYYY-MM

    porCategoria[cat] = (porCategoria[cat] || 0) + monto;
    porMes[mes] = (porMes[mes] || 0) + monto;
  });

  // Escribir tabla por categoría
  hoja.getRange(1, 1).setValue('Por categoría').setFontWeight('bold');
  hoja.getRange(2, 1, 1, 2).setValues([['Categoría', 'Total ARS']]).setFontWeight('bold');
  const catRows = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  hoja.getRange(3, 1, catRows.length, 2).setValues(catRows);
  hoja.getRange(3, 2, catRows.length, 1).setNumberFormat('#,##0.00');

  // Espacio
  const offsetMes = catRows.length + 5;

  // Escribir tabla por mes
  hoja.getRange(offsetMes, 1).setValue('Por mes').setFontWeight('bold');
  hoja.getRange(offsetMes + 1, 1, 1, 2).setValues([['Mes', 'Total ARS']]).setFontWeight('bold');
  const mesRows = Object.entries(porMes).sort((a, b) => b[0].localeCompare(a[0]));
  hoja.getRange(offsetMes + 2, 1, mesRows.length, 2).setValues(mesRows);
  hoja.getRange(offsetMes + 2, 2, mesRows.length, 1).setNumberFormat('#,##0.00');

  hoja.autoResizeColumns(1, 2);
  Logger.log('Resumen actualizado.');
}

// ============================================================
//  ACTUALIZAR HOJA "División" (balance entre personas)
// ============================================================
function actualizarDivision() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let hoja = ss.getSheetByName('División');
  if (!hoja) hoja = ss.insertSheet('División');
  hoja.clearContents();

  const url = `https://secure.splitwise.com/api/v3.0/get_group/${CONFIG.GROUP_ID}`;
  const options = {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + CONFIG.API_KEY },
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  const grupo = data.group;

  if (!grupo) {
    Logger.log('No se pudo obtener info del grupo.');
    return;
  }

  hoja.getRange(1, 1).setValue('Balance del grupo: ' + grupo.name).setFontWeight('bold');
  hoja.getRange(2, 1).setValue('Última actualización: ' + new Date().toLocaleString('es-AR'));

  const headers = ['Persona', 'Balance (ARS)', 'Estado'];
  hoja.getRange(4, 1, 1, 3).setValues([headers]).setFontWeight('bold');

  const miembros = grupo.members || [];
  const filas = miembros.map(m => {
    const balance = m.balance && m.balance[0] ? parseFloat(m.balance[0].amount) : 0;
    const estado = balance > 0 ? 'A cobrar' : balance < 0 ? 'A pagar' : 'Al día';
    return [m.first_name + ' ' + (m.last_name || ''), balance, estado];
  });

  if (filas.length > 0) {
    hoja.getRange(5, 1, filas.length, 3).setValues(filas);
    hoja.getRange(5, 2, filas.length, 1).setNumberFormat('#,##0.00');
  }

  hoja.autoResizeColumns(1, 3);
  Logger.log('División actualizada.');
}

// ============================================================
//  CONFIGURAR TRIGGER DIARIO AUTOMÁTICO
// ============================================================
function crearTriggerDiario() {
  // Eliminar triggers anteriores para evitar duplicados
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('syncSplitwise')
    .timeBased()
    .everyDays(1)
    .atHour(7) // corre todos los días a las 7am
    .create();

  Logger.log('Trigger diario creado. Correrá todos los días a las 7am.');
}

// ============================================================
//  RECIBIR GASTOS DESDE EL FORMULARIO WEB
// ============================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const ss   = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let   hoja = ss.getSheetByName('Gastos Manuales');

    if (!hoja) {
      hoja = ss.insertSheet('Gastos Manuales');
      hoja.getRange(1, 1, 1, 6)
          .setValues([['Fecha', 'Descripción', 'Categoría', 'Monto', 'Quién pagó', 'Registrado']])
          .setFontWeight('bold');
    }

    hoja.appendRow([
      data.fecha,
      data.descripcion,
      data.categoria,
      data.monto,
      data.quien,
      new Date().toLocaleString('es-AR'),
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
//  CÓMO OBTENER TU GROUP_ID:
//  1. Abrí en el browser: https://secure.splitwise.com/api/v3.0/get_groups
//     (con tu sesión de Splitwise activa)
//  2. Buscá el grupo familiar en el JSON
//  3. Copiá el valor del campo "id"
// ============================================================
