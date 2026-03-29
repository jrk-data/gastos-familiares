/**
 * Google Apps Script — Registro de Gastos Familiares
 *
 * Pasos para publicar:
 *  1. Abrí script.google.com y creá un nuevo proyecto.
 *  2. Pegá este código reemplazando el contenido del editor.
 *  3. Cambiá SPREADSHEET_ID por el ID de tu Google Sheet.
 *  4. Desplegá: Implementar > Nueva implementación > Aplicación web
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier usuario
 *  5. Copiá la URL generada y pegala en index.html (constante APPS_SCRIPT_URL).
 */

const SPREADSHEET_ID = "TU_SPREADSHEET_ID_AQUI";
const SHEET_NAME     = "Gastos";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    let   sheet = ss.getSheetByName(SHEET_NAME);

    // Crear hoja y encabezados si no existe
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(["Fecha", "Descripción", "Categoría", "Monto", "Quién pagó", "Registrado"]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold");
    }

    sheet.appendRow([
      data.fecha,
      data.descripcion,
      data.categoria,
      data.monto,
      data.quien,
      new Date().toISOString(),
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

// Útil para probar manualmente desde el editor
function testPost() {
  doPost({
    postData: {
      contents: JSON.stringify({
        fecha:       "2026-03-29",
        descripcion: "Test supermercado",
        categoria:   "Alimentación",
        monto:       1500,
        quien:       "Joaco",
      }),
    },
  });
}
