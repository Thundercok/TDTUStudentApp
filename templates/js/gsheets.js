/**
 * gsheets.js
 * Exports the merged schedule to a new Google Spreadsheet.
 *
 * Sheets created:
 *   1. "Lịch chung"   — grid view (tiết × ngày) with member blocks
 *   2. "Giờ rảnh"     — list of slots where everyone is free
 *   3. "Danh sách môn" — flat table of all classes with member info
 *
 * Depends on: constants.js, config.js (GCONFIG)
 * Reads from: window.members, window.allClasses, window.freeSlots
 */


/* ════════════════════════════════════════════════════════════
   AUTH  — Google Identity Services + gapi
   ════════════════════════════════════════════════════════════ */

let gapiReady  = false;
let tokenClient = null;

function initGoogleApi() {
  // gapi loads asynchronously — check if it's ready
  if (typeof gapi === 'undefined') return;

  gapi.load('client', async () => {
    try {
      await gapi.client.init({
        apiKey:    GCONFIG.API_KEY,
        discoveryDocs: [GCONFIG.DISCOVERY],
      });
      gapiReady = true;
    } catch (e) {
      console.warn('[gsheets] gapi init failed:', e);
    }
  });
}

function getTokenClient() {
  if (tokenClient) return tokenClient;
  if (typeof google === 'undefined') return null;

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GCONFIG.CLIENT_ID,
    scope:     GCONFIG.SCOPES,
    callback:  () => {}, // overridden per-call
  });
  return tokenClient;
}

/** Returns a Promise that resolves when we have a valid access token. */
function requestAccessToken() {
  return new Promise((resolve, reject) => {
    const tc = getTokenClient();
    if (!tc) { reject(new Error('Google Identity Services chưa tải')); return; }

    tc.callback = resp => {
      if (resp.error) reject(new Error(resp.error));
      else resolve(resp);
    };
    tc.requestAccessToken({ prompt: '' });
  });
}


/* ════════════════════════════════════════════════════════════
   EXPORT ENTRY POINT
   ════════════════════════════════════════════════════════════ */

async function exportToSheets() {
  const btn    = document.getElementById('btnSheets');
  const status = document.getElementById('sheetsStatus');

  const visible = members.filter(m => !m.hidden && m.status === 'ok');
  if (!visible.length) { toast('Chưa có lịch để xuất', 'err'); return; }

  if (GCONFIG.CLIENT_ID === 'YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com') {
    status.className = 'sheets-status err';
    status.innerHTML = 'Chưa cấu hình Google API. Mở <code>js/config.js</code> và điền CLIENT_ID + API_KEY.';
    return;
  }

  // UI: loading state
  btn.classList.add('loading');
  btn.textContent = ' Đang kết nối…';
  status.className = 'sheets-status';
  status.textContent = '';

  try {
    // 1. Ensure gapi client is ready
    if (!gapiReady) {
      await new Promise((res, rej) => {
        const limit = Date.now() + 5000;
        const check = () => gapiReady ? res() : Date.now() > limit
          ? rej(new Error('gapi timeout')) : setTimeout(check, 200);
        check();
      });
    }

    // 2. OAuth
    status.textContent = 'Đang xác thực Google…';
    await requestAccessToken();

    // 3. Build spreadsheet data
    status.textContent = 'Đang tạo bảng tính…';
    const title = `LịchCLB — ${new Date().toLocaleDateString('vi-VN')}`;

    const response = await gapi.client.sheets.spreadsheets.create({
      properties: { title, locale: 'vi_VN' },
      sheets: [
        { properties: { title: 'Lịch chung',    sheetId: 0, index: 0 } },
        { properties: { title: 'Giờ rảnh',      sheetId: 1, index: 1 } },
        { properties: { title: 'Danh sách môn', sheetId: 2, index: 2 } },
      ],
    });

    const ssId = response.result.spreadsheetId;
    const ssUrl = `https://docs.google.com/spreadsheets/d/${ssId}`;

    // 4. Populate all sheets
    status.textContent = 'Đang ghi dữ liệu…';
    await writeAllSheets(ssId);

    // 5. Format
    status.textContent = 'Đang định dạng…';
    await applyFormatting(ssId);

    // 6. Done
    status.className = 'sheets-status';
    status.innerHTML = `✓ Đã tạo &nbsp;<a href="${ssUrl}" target="_blank" rel="noopener">Mở Google Sheets ↗</a>`;
    toast('✓ Đã xuất Google Sheets', 'ok');

  } catch (e) {
    console.error('[gsheets] export error:', e);
    status.className = 'sheets-status err';
    status.textContent = 'Lỗi: ' + (e.message || String(e));
    toast('Lỗi xuất Google Sheets', 'err');

  } finally {
    btn.classList.remove('loading');
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-8 12H7v-2h4v2zm0-4H7V9h4v2zm6 4h-4v-2h4v2zm0-4h-4V9h4v2z"/>
      </svg>
      Xuất Google Sheets`;
  }
}


/* ════════════════════════════════════════════════════════════
   DATA BUILDERS
   ════════════════════════════════════════════════════════════ */

async function writeAllSheets(ssId) {
  const data = [
    { range: "'Lịch chung'!A1",    values: buildScheduleGrid() },
    { range: "'Giờ rảnh'!A1",      values: buildFreeSlots() },
    { range: "'Danh sách môn'!A1", values: buildClassList() },
  ];

  await gapi.client.sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: ssId,
    resource: { valueInputOption: 'USER_ENTERED', data },
  });
}

/**
 * Sheet 1: Lịch chung
 * Rows = tiets (1–12), Columns = days (T2–T6)
 * Each cell shows "Subject · Member" for every class in that slot.
 */
function buildScheduleGrid() {
  const days = [2, 3, 4, 5, 6];

  // Header row
  const header = ['Tiết / Giờ', ...days.map(d => DAY_NAMES[d - 2].n)];
  const rows   = [header];

  for (let t = 1; t <= 12; t++) {
    const row = [`Tiết ${t}  (${TIME_TABLE[t]})`];
    days.forEach(d => {
      const classes = allClasses.filter(c => c.day === d && c.tiet_start <= t && c.tiet_end >= t);
      if (!classes.length) {
        const isFree = freeSlots.some(s => s.day === d && s.tiet === t);
        row.push(isFree ? '✓ Rảnh' : '');
      } else {
        row.push(classes.map(c => `${c.subject} · ${c.member}${c.room ? ' [' + c.room + ']' : ''}`).join('\n'));
      }
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Sheet 2: Giờ rảnh
 * Simple list of all free slots grouped by day.
 */
function buildFreeSlots() {
  const rows = [
    ['Tổng số giờ rảnh chung:', freeSlots.length + ' tiết'],
    [],
    ['Thứ', 'Tiết', 'Giờ bắt đầu'],
  ];

  freeSlots.forEach(s => {
    rows.push([DAY_NAMES[s.day - 2].n, `Tiết ${s.tiet}`, s.time]);
  });

  return rows;
}

/**
 * Sheet 3: Danh sách môn
 * All classes with full detail, one row per class.
 */
function buildClassList() {
  const rows = [
    ['Thành viên', 'Môn học', 'Thứ', 'Tiết BĐ', 'Tiết KT', 'Giờ BĐ', 'Giờ KT', 'Phòng'],
  ];

  const visible = members.filter(m => !m.hidden && m.status === 'ok');
  visible.forEach(m => {
    m.classes.forEach(c => {
      rows.push([
        m.name,
        c.subject,
        DAY_NAMES[c.day - 2].n,
        c.tiet_start,
        c.tiet_end,
        c.time_start || TIME_TABLE[c.tiet_start] || '',
        c.time_end   || TIME_TABLE[c.tiet_end]   || '',
        c.room || '',
      ]);
    });
  });

  return rows;
}


/* ════════════════════════════════════════════════════════════
   FORMATTING
   Applied after data is written.
   ════════════════════════════════════════════════════════════ */

async function applyFormatting(ssId) {
  const requests = [
    // ── Sheet 0: Lịch chung ────────────────────────────────
    // Bold + freeze header row
    boldRow(0, 0),
    freezeRow(0, 1),
    freezeCol(0, 1),
    // Column widths
    setColWidth(0, 0, 110),   // time col
    setColWidth(0, 1, 160),   // T2
    setColWidth(0, 2, 160),   // T3
    setColWidth(0, 3, 160),   // T4
    setColWidth(0, 4, 160),   // T5
    setColWidth(0, 5, 160),   // T6
    // Green header background
    headerBg(0, 0, 6, { red: 0.1, green: 0.36, blue: 0.24 }),

    // ── Sheet 1: Giờ rảnh ──────────────────────────────────
    boldRow(1, 2),
    freezeRow(1, 3),
    setColWidth(1, 0, 90),
    setColWidth(1, 1, 70),
    setColWidth(1, 2, 100),
    headerBg(1, 2, 3, { red: 0.1, green: 0.36, blue: 0.24 }),

    // ── Sheet 2: Danh sách môn ─────────────────────────────
    boldRow(2, 0),
    freezeRow(2, 1),
    setColWidth(2, 0, 100),   // Thành viên
    setColWidth(2, 1, 200),   // Môn học
    setColWidth(2, 2, 70),    // Thứ
    setColWidth(2, 3, 60),    // Tiết BĐ
    setColWidth(2, 4, 60),    // Tiết KT
    setColWidth(2, 5, 80),    // Giờ BĐ
    setColWidth(2, 6, 80),    // Giờ KT
    setColWidth(2, 7, 90),    // Phòng
    headerBg(2, 0, 8, { red: 0.1, green: 0.36, blue: 0.24 }),

    // Wrap text in schedule grid cells
    wrapAll(0),
  ];

  await gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId: ssId,
    resource: { requests },
  });
}

// ── Formatting helpers ─────────────────────────────────────

function boldRow(sheetId, rowIndex) {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1 },
      cell: { userEnteredFormat: { textFormat: { bold: true }, horizontalAlignment: 'CENTER' } },
      fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
    },
  };
}

function freezeRow(sheetId, count) {
  return { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: count } }, fields: 'gridProperties.frozenRowCount' } };
}

function freezeCol(sheetId, count) {
  return { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenColumnCount: count } }, fields: 'gridProperties.frozenColumnCount' } };
}

function setColWidth(sheetId, colIndex, pixels) {
  return {
    updateDimensionProperties: {
      range: { sheetId, dimension: 'COLUMNS', startIndex: colIndex, endIndex: colIndex + 1 },
      properties: { pixelSize: pixels },
      fields: 'pixelSize',
    },
  };
}

function headerBg(sheetId, rowIndex, colCount, rgbColor) {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: colCount },
      cell: {
        userEnteredFormat: {
          backgroundColor: rgbColor,
          textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  };
}

function wrapAll(sheetId) {
  return {
    repeatCell: {
      range: { sheetId },
      cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } },
      fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)',
    },
  };
}
