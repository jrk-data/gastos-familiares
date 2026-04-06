# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A family expense tracker. The frontend is a single `index.html` file (no build step, no framework, no bundler). The backend is a Google Apps Script (`apps-script/Code.gs`) deployed as a web app that reads/writes a Google Spreadsheet.

## Deployment

There is no build or test command. Changes are deployed manually:

- **Frontend**: Open `index.html` directly in a browser or host it statically anywhere.
- **Backend**: Copy `apps-script/Code.gs` into the Google Apps Script editor, then deploy as a new web app version (Execute as: Me, Access: Anyone). After each deploy, update `APPS_SCRIPT_URL` in `index.html` if the URL changes.

## Architecture

```
index.html          ← entire frontend: HTML + CSS + JS in one file
apps-script/
  Code.gs           ← Google Apps Script backend
```

**Data flow**: `index.html` → HTTP GET/POST → Apps Script web app → Google Sheets (`Historial` tab)

**Key constants to know:**

- `APPS_SCRIPT_URL` (in `index.html:580`) — deployed Apps Script URL, must match the live deployment.
- `CONFIG.SPREADSHEET_ID` (in `Code.gs:5`) — the Google Sheet storing all data.
- `CONFIG.PORCENTAJE_JOACO = 0.70`, `CONFIG.PORCENTAJE_AGUS = 0.30` — expense split ratio.

**Spreadsheet schema** (`Historial` sheet, columns A–H):
`Fecha | Descripción | Categoría | Monto Total | Moneda | Pagado por | Mi parte | Parte otra persona`

**Frontend structure** (all in `index.html`):
- 3-tab layout with swipe navigation (slides-track / slides-viewport pattern).
- Slide 0: registration form → POST to Apps Script.
- Slide 1: stacked bar chart drawn on `<canvas>` — pure vanilla JS, no chart library.
- Slide 2: history table → GET from Apps Script; click a row to open an edit/delete modal (bottom sheet on mobile, centered on desktop ≥600px).

**Apps Script endpoints:**
- `doGet()` — returns all rows as JSON array (newest first), with `_row` (1-based sheet row number) injected per object.
- `doPost(e)` with `action: 'delete'` — deletes a row by `_row`.
- `doPost(e)` with `action: 'update'` — overwrites a row by `_row`, recalculating the split.
- `doPost(e)` (no action) — appends a new row.

## Categories

Fixed list used in both the form and the chart color map:
Alimentación, Transporte, Salud, Educación, Servicios, Ropa, Entretenimiento, Hogar, Otro.
