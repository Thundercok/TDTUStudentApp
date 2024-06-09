/**
 * debug.js
 * ─────────────────────────────────────────────────────────────
 * Debug mode: loads realistic sample data without a server.
 *
 * HOW TO ACTIVATE:
 *   Option A — URL flag:   add ?debug to the URL
 *              e.g.  http://localhost:5500/?debug
 *   Option B — Console:   call  enableDebug()  in DevTools
 *   Option C — add the script tag then call enableDebug() on load
 *
 * HOW TO DEACTIVATE:
 *   Call disableDebug() or remove ?debug from the URL and refresh.
 * ─────────────────────────────────────────────────────────────
 */

/* ════════════════════════════════════════════════════════════
   SAMPLE DATA
   5 fictional members with realistic TDTU-style schedules.
   ════════════════════════════════════════════════════════════ */

const SAMPLE_MEMBERS = [
  {
    name: 'An Nguyễn',
    classes: [
      { subject: 'Toán cao cấp A1',      day: 2, tiet_start: 1,  tiet_end: 3,  room: 'A1.01', time_start: '07:00', time_end: '08:40' },
      { subject: 'Vật lý đại cương',     day: 3, tiet_start: 4,  tiet_end: 6,  room: 'B2.04', time_start: '09:40', time_end: '11:20' },
      { subject: 'Lập trình cơ bản',     day: 4, tiet_start: 7,  tiet_end: 9,  room: 'C3.02', time_start: '12:30', time_end: '14:10' },
      { subject: 'Tiếng Anh 1',          day: 5, tiet_start: 1,  tiet_end: 3,  room: 'A2.05', time_start: '07:00', time_end: '08:40' },
      { subject: 'Giáo dục thể chất',    day: 6, tiet_start: 10, tiet_end: 12, room: 'Sân A',  time_start: '15:10', time_end: '16:50' },
    ],
  },
  {
    name: 'Bảo Trần',
    classes: [
      { subject: 'Toán cao cấp A1',      day: 2, tiet_start: 1,  tiet_end: 3,  room: 'A1.01', time_start: '07:00', time_end: '08:40' },
      { subject: 'Hóa học đại cương',    day: 2, tiet_start: 7,  tiet_end: 9,  room: 'D1.03', time_start: '12:30', time_end: '14:10' },
      { subject: 'Giải tích 1',          day: 3, tiet_start: 1,  tiet_end: 3,  room: 'A1.02', time_start: '07:00', time_end: '08:40' },
      { subject: 'Lập trình cơ bản',     day: 4, tiet_start: 7,  tiet_end: 9,  room: 'C3.02', time_start: '12:30', time_end: '14:10' },
      { subject: 'Tiếng Anh 1',          day: 6, tiet_start: 4,  tiet_end: 6,  room: 'A2.06', time_start: '09:40', time_end: '11:20' },
    ],
  },
  {
    name: 'Cẩm Lê',
    classes: [
      { subject: 'Vật lý đại cương',     day: 2, tiet_start: 4,  tiet_end: 6,  room: 'B2.01', time_start: '09:40', time_end: '11:20' },
      { subject: 'Giải tích 1',          day: 3, tiet_start: 1,  tiet_end: 3,  room: 'A1.02', time_start: '07:00', time_end: '08:40' },
      { subject: 'Kỹ năng mềm',          day: 3, tiet_start: 7,  tiet_end: 8,  room: 'E1.01', time_start: '12:30', time_end: '13:20' },
      { subject: 'Toán cao cấp A1',      day: 4, tiet_start: 1,  tiet_end: 3,  room: 'A1.03', time_start: '07:00', time_end: '08:40' },
      { subject: 'Tiếng Anh 1',          day: 5, tiet_start: 1,  tiet_end: 3,  room: 'A2.05', time_start: '07:00', time_end: '08:40' },
      { subject: 'Giáo dục thể chất',    day: 6, tiet_start: 1,  tiet_end: 3,  room: 'Sân B', time_start: '07:00', time_end: '08:40' },
    ],
  },
  {
    name: 'Dũng Phạm',
    classes: [
      { subject: 'Hóa học đại cương',    day: 2, tiet_start: 7,  tiet_end: 9,  room: 'D1.03', time_start: '12:30', time_end: '14:10' },
      { subject: 'Kỹ năng mềm',          day: 3, tiet_start: 7,  tiet_end: 8,  room: 'E1.01', time_start: '12:30', time_end: '13:20' },
      { subject: 'Vật lý đại cương',     day: 4, tiet_start: 4,  tiet_end: 6,  room: 'B2.02', time_start: '09:40', time_end: '11:20' },
      { subject: 'Giải tích 1',          day: 5, tiet_start: 4,  tiet_end: 6,  room: 'A1.04', time_start: '09:40', time_end: '11:20' },
      { subject: 'Lập trình cơ bản',     day: 6, tiet_start: 7,  tiet_end: 9,  room: 'C3.01', time_start: '12:30', time_end: '14:10' },
    ],
  },
  {
    name: 'Emie Võ',
    classes: [
      { subject: 'Toán cao cấp A1',      day: 2, tiet_start: 1,  tiet_end: 3,  room: 'A1.01', time_start: '07:00', time_end: '08:40' },
      { subject: 'Vật lý đại cương',     day: 3, tiet_start: 4,  tiet_end: 6,  room: 'B2.04', time_start: '09:40', time_end: '11:20' },
      { subject: 'Kỹ năng mềm',          day: 4, tiet_start: 7,  tiet_end: 8,  room: 'E1.02', time_start: '12:30', time_end: '13:20' },
      { subject: 'Hóa học đại cương',    day: 5, tiet_start: 7,  tiet_end: 9,  room: 'D1.01', time_start: '12:30', time_end: '14:10' },
      { subject: 'Tiếng Anh 1',          day: 6, tiet_start: 4,  tiet_end: 6,  room: 'A2.07', time_start: '09:40', time_end: '11:20' },
    ],
  },
];


/* ════════════════════════════════════════════════════════════
   DEBUG PANEL  (floating button injected into the page)
   ════════════════════════════════════════════════════════════ */

function injectDebugPanel() {
  if (document.getElementById('debugPanel')) return;

  const panel = document.createElement('div');
  panel.id = 'debugPanel';
  panel.innerHTML = `
    <div id="debugBadge">🐞 DEBUG</div>
    <div id="debugMenu">
      <div class="dbg-title">Debug Mode</div>
      <button class="dbg-btn primary" onclick="loadSampleData()">↓ Load sample data</button>
      <button class="dbg-btn"         onclick="loadSampleData(2)">↓ Load 2 members</button>
      <button class="dbg-btn"         onclick="loadSampleData(1)">↓ Load 1 member</button>
      <hr class="dbg-hr">
      <button class="dbg-btn danger"  onclick="disableDebug()">✕ Exit debug</button>
    </div>
  `;
  document.body.appendChild(panel);

  // Inject debug styles
  const style = document.createElement('style');
  style.textContent = `
    #debugPanel {
      position: fixed;
      bottom: 80px; left: 12px;
      z-index: 9000;
      font-family: var(--mono);
    }
    #debugBadge {
      background: #f59e0b;
      color: #1a1917;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: .08em;
      padding: 5px 10px;
      cursor: pointer;
      user-select: none;
      border-radius: 3px;
      box-shadow: 0 2px 8px rgba(0,0,0,.2);
      text-align: center;
    }
    #debugMenu {
      display: none;
      position: absolute;
      bottom: calc(100% + 6px); left: 0;
      background: #1a1917;
      border: 1px solid #333;
      padding: 10px;
      min-width: 180px;
      box-shadow: 0 4px 16px rgba(0,0,0,.4);
      border-radius: 4px;
    }
    #debugMenu.open { display: block; }
    .dbg-title {
      font-size: 9px; font-weight: 500; letter-spacing: .12em;
      text-transform: uppercase; color: #f59e0b;
      margin-bottom: 8px;
    }
    .dbg-btn {
      display: block; width: 100%;
      padding: 7px 10px; margin-bottom: 4px;
      background: #2a2a28; border: 1px solid #444;
      font-family: var(--mono); font-size: 11px; color: #e5e3db;
      cursor: pointer; text-align: left;
      transition: background .12s, border-color .12s;
      border-radius: 2px;
    }
    .dbg-btn:hover         { background: #3a3a38; border-color: #666; }
    .dbg-btn.primary       { border-color: #2a7a54; color: #6ecf9a; }
    .dbg-btn.primary:hover { background: #1a3a2a; }
    .dbg-btn.danger        { border-color: #7a2335; color: #f09090; }
    .dbg-btn.danger:hover  { background: #3a1520; }
    .dbg-hr { border: none; border-top: 1px solid #333; margin: 8px 0; }
  `;
  document.head.appendChild(style);

  // Toggle menu on badge click
  document.getElementById('debugBadge').addEventListener('click', () => {
    document.getElementById('debugMenu').classList.toggle('open');
  });

  // Close menu when clicking elsewhere
  document.addEventListener('click', e => {
    if (!panel.contains(e.target)) {
      document.getElementById('debugMenu')?.classList.remove('open');
    }
  });
}


/* ════════════════════════════════════════════════════════════
   LOAD SAMPLE DATA
   ════════════════════════════════════════════════════════════ */

/**
 * Clears current state and loads N sample members.
 * @param {number} count  How many members to load (default: all 5)
 */
function loadSampleData(count = SAMPLE_MEMBERS.length) {
  // Clear existing data
  members    = [];
  allClasses = [];
  freeSlots  = [];

  const subset = SAMPLE_MEMBERS.slice(0, count);

  subset.forEach((s, i) => {
    const ci = i % PAL.length;
    members.push({
      id:       Date.now() + i,
      name:     s.name,
      c:        PAL[ci].c,
      bg:       PAL[ci].bg,
      classes:  s.classes.map(c => ({ ...c, member: s.name })),
      hidden:   false,
      status:   'ok',
      savedAt:  Date.now(),
    });
  });

  renderMemberList();

  // Client-side merge (no server needed in debug mode)
  allClasses = members.flatMap(m => m.classes);

  const busy = {};
  for (let d = 2; d <= 6; d++) { busy[d] = {}; for (let t = 1; t <= 12; t++) busy[d][t] = 0; }
  members.forEach(m => m.classes.forEach(c => {
    for (let t = c.tiet_start; t <= c.tiet_end; t++)
      if (busy[c.day]?.[t] !== undefined) busy[c.day][t]++;
  }));
  freeSlots = [];
  for (let d = 2; d <= 6; d++)
    for (let t = 1; t <= 12; t++)
      if (busy[d][t] === 0) freeSlots.push({ day: d, tiet: t, time: TIME_TABLE[t] });

  renderCalendar();
  renderStorageBar();

  document.getElementById('debugMenu')?.classList.remove('open');
  toast(`🐞 Đã nạp ${count} thành viên mẫu`, 'ok');
  console.info('[debug] Loaded', count, 'sample members:', members.map(m => m.name));
}


/* ════════════════════════════════════════════════════════════
   ENABLE / DISABLE
   ════════════════════════════════════════════════════════════ */

function enableDebug() {
  sessionStorage.setItem('lichclb_debug', '1');
  injectDebugPanel();
  console.info('[debug] Debug mode enabled. Call loadSampleData() to populate.');
}

function disableDebug() {
  sessionStorage.removeItem('lichclb_debug');
  document.getElementById('debugPanel')?.remove();
  // Remove injected style (last style tag added by debug)
  toast('Debug mode off — refresh to fully reset');
  console.info('[debug] Debug mode disabled.');
}


/* ════════════════════════════════════════════════════════════
   AUTO-ACTIVATE
   Activates if ?debug is in the URL or sessionStorage flag is set.
   ════════════════════════════════════════════════════════════ */

(function autoInit() {
  const urlDebug  = new URLSearchParams(window.location.search).has('debug');
  const sessDebug = sessionStorage.getItem('lichclb_debug') === '1';

  if (urlDebug || sessDebug) {
    // Wait for DOM + other modules to be ready
    window.addEventListener('DOMContentLoaded', () => {
      // Slight delay so main.js boot (load()) runs first
      setTimeout(() => {
        enableDebug();
        // Auto-load all 5 members if no saved data exists
        if (!members.length) loadSampleData();
      }, 300);
    });
  }
})();
