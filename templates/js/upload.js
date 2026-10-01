/**
 * upload.js
 * Manages all four upload modes (Image · Manual · CSV · Text)
 * and produces a standardised `classes[]` array for each member.
 *
 * Depends on: constants.js, ui.js (esc, toast)
 * Calls: setReadyClasses() defined below and used by main.js
 */


/* ════════════════════════════════════════════════════════════
   UPLOAD MODE TABS
   ════════════════════════════════════════════════════════════ */

// Tracks which pane is active and what data is ready
let activeTab    = 'image'; // 'image' | 'manual' | 'csv' | 'text'
let pendingFile  = null;    // File object for image / csv tabs
let manualRows   = [];      // Array of class objects for manual tab
let csvClasses   = [];      // Parsed classes from CSV

function initUploadTabs() {
  document.getElementById('uploadTabs').addEventListener('click', e => {
    const tab = e.target.closest('.utab');
    if (!tab) return;
    switchTab(tab.dataset.tab);
  });

  // Enforce initial state — don't rely solely on HTML classes
  switchTab('image');
}

function switchTab(tab) {
  activeTab = tab;

  // Update tab button highlights
  document.querySelectorAll('.utab').forEach(b =>
    b.classList.toggle('on', b.dataset.tab === tab)
  );

  // Show/hide panes via style.display — avoids all CSS specificity issues
  ['image', 'manual', 'csv', 'text'].forEach(id => {
    const pane = document.getElementById(`pane-${id}`);
    if (pane) pane.style.display = (id === tab) ? 'block' : 'none';
  });

  // Reset pending file state when switching away from image tab
  pendingFile = null;
  const pw = document.getElementById('pw');
  if (pw) pw.style.display = 'none';

  checkAddReady();
}


/* ════════════════════════════════════════════════════════════
   READINESS CHECK
   Called by every upload path when something changes.
   Enables the main "Thêm" button only when data is ready.
   ════════════════════════════════════════════════════════════ */

function checkAddReady() {
  const name = document.getElementById('ni').value.trim();
  let dataReady = false;

  switch (activeTab) {
    case 'image':  dataReady = !!pendingFile; break;
    case 'manual': dataReady = manualRows.length > 0; break;
    case 'csv':    dataReady = csvClasses.length > 0; break;
    case 'text':   dataReady = document.getElementById('textInput').value.trim().length > 10; break;
  }

  document.getElementById('ba').disabled = !(name && dataReady);
}


/* ════════════════════════════════════════════════════════════
   TAB: IMAGE
   ════════════════════════════════════════════════════════════ */

function initImageTab() {
  const dz = document.getElementById('dz');
  const fi = document.getElementById('fi');

  dz.addEventListener('click', () => fi.click());

  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag');
    if (e.dataTransfer.files[0]) setImageFile(e.dataTransfer.files[0]);
  });

  fi.addEventListener('change', () => {
    if (fi.files[0]) setImageFile(fi.files[0]);
    fi.value = '';
  });
}

function setImageFile(f) {
  pendingFile = f;
  const img = document.getElementById('pi');
  img.src = URL.createObjectURL(f);
  document.getElementById('pw').style.display = 'block';
  checkAddReady();
}

/**
 * Called by main.js when the user submits in Image mode.
 * Returns the parsed classes array from the server.
 */
async function collectImageClasses(name) {
  const b64 = await toBase64(pendingFile);
  const res  = await fetch('/api/parse-schedule', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ image: b64, name }),
  });
  const d = await res.json();
  if (!d.success) throw new Error(d.error || 'Server error');
  return d.data;
}


/* ════════════════════════════════════════════════════════════
   TAB: MANUAL ENTRY
   ════════════════════════════════════════════════════════════ */

function initManualTab() {
  // Populate tiết dropdowns (1–12)
  const startSel = document.getElementById('mStart');
  const endSel   = document.getElementById('mEnd');
  for (let t = 1; t <= 12; t++) {
    const opt = v => { const o = document.createElement('option'); o.value = t; o.textContent = `Tiết ${t} (${TIME_TABLE[t]})`; return o; };
    startSel.appendChild(opt(t));
    endSel.appendChild(opt(t));
  }
  startSel.value = 1;
  endSel.value   = 3;

  document.getElementById('btnAddRow').addEventListener('click', addManualRow);

  // Allow Enter in subject/room inputs
  ['mSubject', 'mRoom'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') addManualRow();
    });
  });
}

function addManualRow() {
  const subject = document.getElementById('mSubject').value.trim();
  const day     = parseInt(document.getElementById('mDay').value);
  const start   = parseInt(document.getElementById('mStart').value);
  const end     = parseInt(document.getElementById('mEnd').value);
  const room    = document.getElementById('mRoom').value.trim();

  if (!subject) {
    document.getElementById('mSubject').focus();
    toast('Nhập tên môn học trước', 'err');
    return;
  }
  if (end < start) {
    toast('Tiết kết thúc phải ≥ tiết bắt đầu', 'err');
    return;
  }

  const row = { subject, day, tiet_start: start, tiet_end: end, room, time_start: TIME_TABLE[start], time_end: TIME_TABLE[end] };
  manualRows.push(row);
  renderManualTable();
  checkAddReady();

  // Reset subject & room for next entry
  document.getElementById('mSubject').value = '';
  document.getElementById('mRoom').value    = '';
  document.getElementById('mSubject').focus();
}

function deleteManualRow(index) {
  manualRows.splice(index, 1);
  renderManualTable();
  checkAddReady();
}

function renderManualTable() {
  const wrap  = document.getElementById('manualTableWrap');
  const tbody = document.getElementById('manualTbody');

  if (!manualRows.length) { wrap.style.display = 'none'; return; }

  wrap.style.display = 'block';
  tbody.innerHTML = manualRows.map((r, i) => `
    <tr>
      <td title="${esc(r.subject)}">${esc(r.subject)}</td>
      <td>T${r.day}</td>
      <td>${r.tiet_start}–${r.tiet_end}</td>
      <td>${esc(r.room) || '—'}</td>
      <td><button class="row-del" onclick="deleteManualRow(${i})" title="Xoá">×</button></td>
    </tr>`).join('');
}

/** Returns the manually entered classes (no async needed). */
function collectManualClasses() {
  return [...manualRows];
}


/* ════════════════════════════════════════════════════════════
   TAB: CSV UPLOAD
   ════════════════════════════════════════════════════════════ */

function initCsvTab() {
  const dzCsv = document.getElementById('dzCsv');
  const fCsv  = document.getElementById('fCsv');

  dzCsv.addEventListener('click', () => fCsv.click());

  dzCsv.addEventListener('dragover', e => { e.preventDefault(); dzCsv.classList.add('drag'); });
  dzCsv.addEventListener('dragleave', () => dzCsv.classList.remove('drag'));
  dzCsv.addEventListener('drop', e => {
    e.preventDefault();
    dzCsv.classList.remove('drag');
    if (e.dataTransfer.files[0]) readCsvFile(e.dataTransfer.files[0]);
  });

  fCsv.addEventListener('change', () => {
    if (fCsv.files[0]) readCsvFile(fCsv.files[0]);
    fCsv.value = '';
  });
}

function readCsvFile(f) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      csvClasses = parseCsv(e.target.result);
      showCsvPreview(f.name, csvClasses.length);
      checkAddReady();
    } catch (err) {
      toast('Lỗi đọc CSV: ' + err.message, 'err');
    }
  };
  reader.readAsText(f, 'UTF-8');
}

/**
 * Parses a CSV string into an array of class objects.
 * Expected columns (in any order): subject, day, tiet_start, tiet_end, room
 * Delimiter: comma or semicolon. First row must be a header.
 */
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('File CSV phải có ít nhất 1 dòng dữ liệu');

  // Detect delimiter
  const delim = lines[0].includes(';') ? ';' : ',';

  const headers = lines[0].split(delim).map(h => h.trim().toLowerCase());
  const required = ['subject', 'day', 'tiet_start', 'tiet_end'];
  required.forEach(col => {
    if (!headers.includes(col)) throw new Error(`Thiếu cột "${col}"`);
  });

  const idx = col => headers.indexOf(col);

  const classes = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delim).map(c => c.trim());
    if (cells.every(c => !c)) continue; // skip blank rows

    const subject    = cells[idx('subject')]    || '';
    const day        = parseInt(cells[idx('day')]);
    const tiet_start = parseInt(cells[idx('tiet_start')]);
    const tiet_end   = parseInt(cells[idx('tiet_end')]);
    const room       = idx('room') >= 0 ? (cells[idx('room')] || '') : '';

    // Validation
    if (!subject)                       throw new Error(`Dòng ${i+1}: thiếu tên môn`);
    if (![2,3,4,5,6].includes(day))     throw new Error(`Dòng ${i+1}: ngày phải là 2–6`);
    if (tiet_start < 1 || tiet_start > 12) throw new Error(`Dòng ${i+1}: tiết bắt đầu ngoài phạm vi`);
    if (tiet_end < tiet_start)           throw new Error(`Dòng ${i+1}: tiết kết thúc < tiết bắt đầu`);

    classes.push({
      subject, day, tiet_start, tiet_end, room,
      time_start: TIME_TABLE[tiet_start],
      time_end:   TIME_TABLE[tiet_end],
    });
  }

  if (!classes.length) throw new Error('Không có môn nào hợp lệ trong file');
  return classes;
}

function showCsvPreview(filename, count) {
  const pw = document.getElementById('pwCsv');
  const preview = document.getElementById('csvPreview');
  pw.style.display = 'block';
  preview.textContent = `✓ ${filename} — ${count} môn hợp lệ`;
}

/** Returns the CSV-parsed classes. */
function collectCsvClasses() {
  return [...csvClasses];
}


/* ════════════════════════════════════════════════════════════
   TAB: PASTE TEXT
   ════════════════════════════════════════════════════════════ */

function initTextTab() {
  document.getElementById('textInput').addEventListener('input', checkAddReady);
}

/**
 * Sends pasted text to the server's parse endpoint.
 * Returns the parsed classes array.
 */
async function collectTextClasses(name) {
  const text = document.getElementById('textInput').value.trim();
  const res  = await fetch('/api/parse-text', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text, name }),
  });
  const d = await res.json();
  if (!d.success) throw new Error(d.error || 'Server error');
  return d.data;
}


/* ════════════════════════════════════════════════════════════
   UNIFIED COLLECT  — called by main.js when "Thêm" is clicked
   ════════════════════════════════════════════════════════════ */

/**
 * Collects classes from whichever tab is active.
 * Async because image and text modes need a server round-trip.
 * @param {string} name  Member name (used for server calls)
 * @returns {Promise<Array>} Normalised class objects
 */
async function collectClasses(name) {
  switch (activeTab) {
    case 'image':  return await collectImageClasses(name);
    case 'manual': return collectManualClasses();
    case 'csv':    return collectCsvClasses();
    case 'text':   return await collectTextClasses(name);
    default: throw new Error('Unknown upload tab: ' + activeTab);
  }
}

/** Resets all upload state after a member is successfully added. */
function resetUploadState() {
  pendingFile = null;
  manualRows  = [];
  csvClasses  = [];

  document.getElementById('pw').style.display      = 'none';
  document.getElementById('pwCsv').style.display   = 'none';
  document.getElementById('manualTableWrap').style.display = 'none';
  document.getElementById('manualTbody').innerHTML  = '';
  document.getElementById('textInput').value        = '';
  document.getElementById('mSubject').value         = '';
  document.getElementById('mRoom').value            = '';
}


/* ════════════════════════════════════════════════════════════
   UTILITY
   ════════════════════════════════════════════════════════════ */

function toBase64(f) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(f);
  });
}
