/**
 * storage.js
 * Handles persisting and restoring member data via localStorage.
 * Also renders the storage info bar in the panel footer.
 *
 * Depends on: constants.js (LS_KEY)
 * Writes to: window.members  (defined in main.js)
 * Calls: renderMemberList(), merge()  (defined in ui.js / calendar.js)
 */

// ── Save ───────────────────────────────────────────────────────
// Serialises all successfully parsed members to localStorage.
function save() {
  try {
    const data = members
      .filter(m => m.status === 'ok')
      .map(m => ({
        id:      m.id,
        name:    m.name,
        c:       m.c,
        bg:      m.bg,
        classes: m.classes,
        hidden:  m.hidden,
        savedAt: m.savedAt || Date.now(),
      }));

    localStorage.setItem(LS_KEY, JSON.stringify(data));
    renderStorageBar();
  } catch (e) {
    console.warn('[storage] Save failed:', e);
  }
}

// ── Load ───────────────────────────────────────────────────────
// Restores members from localStorage on page boot.
// Silently does nothing if there is no saved data.
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;

    const data = JSON.parse(raw);
    if (!Array.isArray(data) || !data.length) return;

    members = data.map(m => ({ ...m, status: 'ok' }));
    renderMemberList();
    merge();
    toast('Đã tải lịch: ' + members.map(m => m.name).join(', '), 'ok');
  } catch (e) {
    console.warn('[storage] Load failed:', e);
  }
}

// ── Clear ──────────────────────────────────────────────────────
// Removes all saved data after user confirmation.
function clearAll() {
  if (!confirm('Xoá toàn bộ lịch đã lưu?')) return;

  localStorage.removeItem(LS_KEY);
  members = [];
  allClasses = [];
  freeSlots = [];

  renderMemberList();
  renderCalendar();
  renderStorageBar();
  toast('Đã xoá toàn bộ dữ liệu');
}

// ── Storage bar ────────────────────────────────────────────────
// Shows how many schedules are saved and their size in KB.
function renderStorageBar() {
  const bar = document.getElementById('storageBar');
  if (!bar) return;

  try {
    const raw   = localStorage.getItem(LS_KEY) || '[]';
    const kb    = (new Blob([raw]).size / 1024).toFixed(1);
    const count = members.filter(m => m.status === 'ok').length;

    bar.innerHTML = count > 0
      ? `<span style="color:var(--green)">● ${count} lịch đã lưu</span>
         <span style="color:var(--ink3)"> · ${kb} KB</span>
         <button onclick="clearAll()">Xoá tất cả</button>`
      : `<span style="color:var(--ink3)">Chưa có dữ liệu lưu</span>`;
  } catch {
    bar.innerHTML = '';
  }
}
