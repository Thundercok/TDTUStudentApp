/**
 * calendar.js
 * Schedule merging, filter state, and calendar DOM rendering.
 *
 * Depends on: constants.js, ui.js (esc, toast)
 * Reads from: window.members
 * Writes to:  window.allClasses, window.freeSlots, window.activeFilter
 */

// Current active day filter: 'all' | 'free' | 2 | 3 | 4 | 5 | 6
let activeFilter = 'all';


/* ════════════════════════════════════════════════════════════
   MERGE  — combine all visible members' schedules
   ════════════════════════════════════════════════════════════ */

async function merge() {
  const visible = members.filter(m => !m.hidden && m.status === 'ok');

  if (!visible.length) {
    allClasses = [];
    freeSlots  = [];
    renderCalendar();
    return;
  }

  try {
    // Try server-side merge first
    const res = await fetch('/api/merge-schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedules: visible.map(m => ({ name: m.name, classes: m.classes })),
      }),
    });
    const d = await res.json();
    if (d.success) {
      allClasses = d.classes;
      freeSlots  = d.free_slots;
    }
  } catch {
    // ── Client-side fallback ────────────────────────────────
    // Flatten all classes from all visible members
    allClasses = visible.flatMap(m => m.classes);

    // Build a busy-count map: busy[day][tiet] = number of members busy
    const busy = {};
    for (let d = 2; d <= 6; d++) {
      busy[d] = {};
      for (let t = 1; t <= 12; t++) busy[d][t] = 0;
    }
    visible.forEach(m =>
      m.classes.forEach(cls => {
        for (let t = cls.tiet_start; t <= cls.tiet_end; t++) {
          if (busy[cls.day]?.[t] !== undefined) busy[cls.day][t]++;
        }
      })
    );

    // Any slot where busy count is 0 → everyone is free
    freeSlots = [];
    for (let d = 2; d <= 6; d++) {
      for (let t = 1; t <= 12; t++) {
        if (busy[d][t] === 0) {
          freeSlots.push({ day: d, tiet: t, time: TIME_TABLE[t] });
        }
      }
    }
  }

  renderCalendar();
}


/* ════════════════════════════════════════════════════════════
   FILTER
   ════════════════════════════════════════════════════════════ */

// Called by filter strip buttons (via data-filter attribute, wired in main.js)
function applyFilter(value, clickedBtn) {
  activeFilter = value;

  // Update filter button states
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('on'));
  if (clickedBtn) clickedBtn.classList.add('on');

  // Sync mobile bottom nav highlight
  document.querySelectorAll('.mob-nav-btn').forEach(b => b.classList.remove('on'));
  const navTarget = value === 'free' ? 'navFree' : 'navCal';
  document.getElementById(navTarget)?.classList.add('on');

  renderCalendar();
}


/* ════════════════════════════════════════════════════════════
   RENDER CALENDAR
   ════════════════════════════════════════════════════════════ */

function renderCalendar() {
  const visible = members.filter(m => !m.hidden && m.status === 'ok');
  const hasData = visible.length > 0;

  // Show/hide meta row and filter strip
  document.getElementById('metaRow').style.display = hasData ? 'flex'  : 'none';
  document.getElementById('fs').style.display      = hasData ? 'flex'  : 'none';

  // Update stat counters
  if (hasData) {
    document.getElementById('sM').textContent = visible.length;
    document.getElementById('sC').textContent = allClasses.length;
    document.getElementById('sF').textContent = freeSlots.length;
  }

  // Update free-slots panel in the sidebar
  renderFreePanel(visible.length);

  // Empty state
  if (!hasData) {
    document.getElementById('cw').innerHTML = `
      <div class="empty-state">
        <div class="empty-title">Chưa có lịch nào</div>
        <div class="empty-sub">
          Upload ảnh thời khoá biểu của từng thành viên<br>
          để bắt đầu tổng hợp.
        </div>
      </div>`;
    return;
  }

  // Build grid
  const days    = (activeFilter === 'all' || activeFilter === 'free')
    ? [2, 3, 4, 5, 6]
    : [parseInt(activeFilter)];
  const cols     = days.length;
  const timeColW = cols === 1 ? '44px' : '50px';

  let html = `
    <div class="cal">
      <div class="cal-grid"
           style="grid-template-columns: ${timeColW} repeat(${cols}, 1fr)">`;

  // ── Header row ──────────────────────────────────────────────
  html += `<div class="cal-corner"></div>`;
  days.forEach(d => {
    const hasFree   = freeSlots.some(s => s.day === d);
    const label     = cols > 3 ? DAY_NAMES[d - 2].s : DAY_NAMES[d - 2].n;
    const freeBadge = hasFree ? `<div class="day-free-badge">● rảnh</div>` : '';
    html += `
      <div class="cal-day-header">
        <div class="day-name">${label}</div>
        ${freeBadge}
      </div>`;
  });

  // ── Time rows ───────────────────────────────────────────────
  for (let t = 1; t <= 12; t++) {
    html += `<div class="time-cell">${TIME_TABLE[t]}</div>`;

    days.forEach(d => {
      const isFree   = freeSlots.some(s => s.day === d && s.tiet === t);
      const showFree = isFree && (activeFilter === 'all' || activeFilter === 'free');
      const cellCls  = showFree ? ' free-slot' : '';

      html += `<div class="cal-cell${cellCls}" data-d="${d}" data-t="${t}">`;

      // Blocks that start on this tiet
      const startsHere = allClasses.filter(c => c.day === d && c.tiet_start === t);
      const colW       = startsHere.length ? 100 / startsHere.length : 100;

      startsHere.forEach((cls, bi) => {
        const mem = members.find(m => m.name === cls.member);
        if (!mem) return;

        const blockH   = (cls.tiet_end - cls.tiet_start + 1) * 48 - 5;
        const leftPct  = (bi * colW).toFixed(1);
        const widthPct = (colW - 0.5).toFixed(1);
        const timeStart = cls.time_start || TIME_TABLE[t];
        const timeEnd   = cls.time_end   || '';
        const room      = cls.room       || '';

        // Tooltip attributes — escape all user-sourced strings
        const tipAttrs = `
          onmouseenter="showTip(event,
            '${esc(cls.subject)}',
            '${esc(mem.name)}',
            '${esc(room)}',
            '${esc(timeStart)}',
            '${esc(timeEnd)}')"
          onmouseleave="document.getElementById('tip').classList.remove('on')"`;

        html += `
          <div class="blk"
               style="height:     ${blockH}px;
                      left:       ${leftPct}%;
                      width:      ${widthPct}%;
                      background: ${mem.bg};
                      border-left-color: ${mem.c};
                      color:      ${mem.c};"
               ${tipAttrs}>
            <div class="blk-name">${esc(cls.subject)}</div>
            <div class="blk-sub">
              ${esc(mem.name)}${room ? ' · ' + esc(room) : ''}
            </div>
          </div>`;
      });

      html += `</div>`; // .cal-cell
    });
  }

  html += `</div></div>`; // .cal-grid  .cal
  document.getElementById('cw').innerHTML = html;
}


/* ════════════════════════════════════════════════════════════
   FREE PANEL  (sidebar chip list)
   ════════════════════════════════════════════════════════════ */

function renderFreePanel(memberCount) {
  const fp = document.getElementById('fp');
  const fc = document.getElementById('fc');

  if (!freeSlots.length || !memberCount) {
    fp.style.display = 'none';
    return;
  }

  fp.style.display = 'block';
  const shown = freeSlots.slice(0, 14);

  fc.innerHTML =
    shown.map(s => `<div class="chip">${DAY_SHORT[s.day]} ${s.time}</div>`).join('')
    + (freeSlots.length > 14
        ? `<div class="chip">+${freeSlots.length - 14}</div>`
        : '');
}
