/**
 * calendar.js
 * Schedule merging, filter state, and calendar DOM rendering.
 *
 * Depends on: constants.js, ui.js (esc, toast)
 * Reads from: window.members
 * Writes to:  window.allClasses, window.freeSlots, window.activeFilter
 */

// Current active day filter: 'all' | 'free' | 2 | 3 | 4 | 5 | 6 | 7
let activeFilter = 'all';

// All weekdays including Saturday
const ALL_DAYS = [2, 3, 4, 5, 6, 7];


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
    allClasses = visible.flatMap(m => m.classes);

    const busy = {};
    for (const d of ALL_DAYS) {
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

    freeSlots = [];
    for (const d of ALL_DAYS) {
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

function applyFilter(value, clickedBtn) {
  activeFilter = value;

  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('on'));
  if (clickedBtn) clickedBtn.classList.add('on');

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

  document.getElementById('metaRow').style.display = hasData ? 'flex' : 'none';
  document.getElementById('fs').style.display      = hasData ? 'flex' : 'none';

  if (hasData) {
    document.getElementById('sM').textContent = visible.length;
    document.getElementById('sC').textContent = allClasses.length;
    document.getElementById('sF').textContent = freeSlots.length;
  }

  renderFreePanel(visible.length);

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

  // Which days to show — auto-hide Saturday if no one has classes on it
  let days;
  if (activeFilter === 'all' || activeFilter === 'free') {
    const hasSat = allClasses.some(c => c.day === 7);
    days = hasSat ? ALL_DAYS : [2, 3, 4, 5, 6];
  } else {
    days = [parseInt(activeFilter)];
  }

  const cols     = days.length;
  const timeColW = cols === 1 ? '52px' : cols <= 3 ? '52px' : '48px';
  const CELL_H   = 52; // px per tiết

  let html = `
    <div class="cal">
      <div class="cal-grid"
           style="grid-template-columns: ${timeColW} repeat(${cols}, 1fr)">`;

  // ── Header row ─────────────────────────────────────────────
  html += `<div class="cal-corner"></div>`;
  days.forEach(d => {
    const hasFree = freeSlots.some(s => s.day === d);
    // Use index: day 2 → index 0, day 7 → index 5
    const dayIdx  = d - 2;
    const label   = cols > 4 ? DAY_NAMES[dayIdx].s : DAY_NAMES[dayIdx].n;
    const isSat   = d === 7;
    html += `
      <div class="cal-day-header${isSat ? ' is-sat' : ''}">
        <div class="day-name">${label}</div>
        ${hasFree ? `<div class="day-free-badge">rảnh</div>` : ''}
      </div>`;
  });

  // ── Time rows ───────────────────────────────────────────────
  for (let t = 1; t <= 12; t++) {
    html += `
      <div class="time-cell">
        <span class="time-tiet">Tiết ${t}</span>
        <span class="time-clock">${TIME_TABLE[t]}</span>
      </div>`;

    days.forEach(d => {
      const isFree   = freeSlots.some(s => s.day === d && s.tiet === t);
      const showFree = isFree && (activeFilter === 'all' || activeFilter === 'free');
      const isSat    = d === 7;
      let cellCls    = '';
      if (showFree) cellCls += ' free-slot';
      if (isSat)    cellCls += ' sat-col';

      html += `<div class="cal-cell${cellCls}" data-d="${d}" data-t="${t}">`;

      const startsHere = allClasses.filter(c => c.day === d && c.tiet_start === t);
      const colW = startsHere.length ? 100 / startsHere.length : 100;

      startsHere.forEach((cls, bi) => {
        const mem = members.find(m => m.name === cls.member);
        if (!mem) return;

        const blockH    = (cls.tiet_end - cls.tiet_start + 1) * CELL_H - 4;
        const leftPct   = (bi * colW).toFixed(1);
        const widthPct  = (colW - 0.4).toFixed(1);
        const timeStart = cls.time_start || TIME_TABLE[t];
        const timeEnd   = cls.time_end   || TIME_TABLE[cls.tiet_end] || '';
        const room      = cls.room || '';

        const tipAttrs = `
          onmouseenter="showTip(event,
            '${esc(cls.subject)}',
            '${esc(mem.name)}',
            '${esc(room)}',
            '${esc(timeStart)}',
            '${esc(timeEnd)}')"
          onmouseleave="document.getElementById('tip').classList.remove('on')"`;

        // Solid-colour block: member's c is the background, white text on top
        html += `
          <div class="blk"
               style="height:     ${blockH}px;
                      left:       ${leftPct}%;
                      width:      ${widthPct}%;
                      background: ${mem.c};
                      --blk-color: ${mem.c};"
               ${tipAttrs}>
            <div class="blk-name">${esc(cls.subject)}</div>
            <div class="blk-sub">${esc(mem.name)}${room ? ' · ' + esc(room) : ''}</div>
          </div>`;
      });

      html += `</div>`; // .cal-cell
    });
  }

  html += `</div></div>`; // .cal-grid .cal
  document.getElementById('cw').innerHTML = html;
}


/* ════════════════════════════════════════════════════════════
   FREE PANEL
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
