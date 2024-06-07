/**
 * ui.js
 * All non-calendar UI: drawer, member list, toasts, tooltip, export.
 *
 * Depends on: constants.js, storage.js
 * Reads from: window.members, window.allClasses, window.freeSlots
 */


/* ════════════════════════════════════════════════════════════
   MOBILE DRAWER
   ════════════════════════════════════════════════════════════ */

const isMobile = () => window.innerWidth <= 680;

function openDrawer() {
  if (!isMobile()) return;
  panel.classList.add('open');
  overlay.classList.add('vis');
  drawerClose.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  panel.classList.remove('open');
  overlay.classList.remove('vis');
  drawerClose.style.display = 'none';
  document.body.style.overflow = '';
}

// Mobile bottom nav tab switching
function mobTab(tab) {
  document.querySelectorAll('.mob-nav-btn').forEach(b => b.classList.remove('on'));

  if (tab === 'cal') {
    document.getElementById('navCal').classList.add('on');
    applyFilter('all', document.querySelector('[data-filter="all"]'));
  } else {
    document.getElementById('navFree').classList.add('on');
    applyFilter('free', document.querySelector('[data-filter="free"]'));
  }

  document.getElementById('mainEl').scrollIntoView({ behavior: 'smooth' });
}


/* ════════════════════════════════════════════════════════════
   MEMBER LIST
   ════════════════════════════════════════════════════════════ */

function renderMemberList() {
  const mc = document.getElementById('mc');
  mc.textContent = '(' + members.length + ')';

  // Keep the toggle button label in sync
  document.getElementById('drawerToggle').textContent =
    '☰ ' + members.length + ' thành viên';

  if (!members.length) {
    ml.innerHTML = '<div class="empty-members">Chưa có ai</div>';
    return;
  }

  ml.innerHTML = members.map(m => {
    const savedBadge = m.savedAt
      ? `<span class="saved-badge"
           title="Đã lưu lúc ${new Date(m.savedAt).toLocaleString('vi-VN')}">
           ✓ đã lưu
         </span>`
      : '';

    const statusLabel =
      m.status === 'busy' ? 'đang đọc…' :
      m.status === 'err'  ? 'lỗi đọc lịch' :
      m.classes.length + ' môn';

    return `
      <div class="member-row ${m.hidden ? 'dim' : ''}"
           onclick="toggleMember(${m.id})">
        <div class="avatar" style="background:${m.bg}; color:${m.c}">
          ${m.name[0].toUpperCase()}
        </div>
        <div class="member-info">
          <div class="member-name">${esc(m.name)}${savedBadge}</div>
          <div class="member-status">${statusLabel}</div>
        </div>
        <div class="status-dot ${m.status}"></div>
        <button class="del-btn"
          onclick="deleteMember(event, ${m.id})"
          aria-label="Xoá ${esc(m.name)}">×</button>
      </div>`;
  }).join('');
}

function toggleMember(id) {
  const m = members.find(x => x.id === id);
  if (!m) return;
  m.hidden = !m.hidden;
  renderMemberList();
  merge();
  save();
}

function deleteMember(e, id) {
  e.stopPropagation();
  members = members.filter(x => x.id !== id);
  renderMemberList();
  merge();
  save();
}


/* ════════════════════════════════════════════════════════════
   TOASTS
   ════════════════════════════════════════════════════════════ */

function toast(msg, type = 'default') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.getElementById('tts').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}


/* ════════════════════════════════════════════════════════════
   TOOLTIP  (desktop only — hidden via CSS on mobile)
   ════════════════════════════════════════════════════════════ */

function showTip(e, subject, memberName, room, timeStart, timeEnd) {
  const tip = document.getElementById('tip');
  tip.textContent = [
    subject,
    memberName,
    room,
    timeStart + (timeEnd ? ' – ' + timeEnd : ''),
  ].filter(Boolean).join('\n');
  tip.classList.add('on');
}

// Track cursor to reposition tooltip
document.addEventListener('mousemove', e => {
  const tip = document.getElementById('tip');
  tip.style.left = (e.clientX + 16) + 'px';
  tip.style.top  = (e.clientY - 8) + 'px';
});


/* ════════════════════════════════════════════════════════════
   EXPORT
   ════════════════════════════════════════════════════════════ */

async function expPNG() {
  const el = document.querySelector('.cal');
  if (!el) { toast('Chưa có lịch', 'err'); return; }
  toast('Đang xuất…');

  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
  const a = document.createElement('a');
  a.href     = canvas.toDataURL();
  a.download = 'lich-clb.png';
  a.click();
  toast('✓ Đã xuất PNG', 'ok');
}

async function expPDF() {
  const el = document.querySelector('.cal');
  if (!el) { toast('Chưa có lịch', 'err'); return; }
  toast('Đang xuất PDF…');

  const { jsPDF } = window.jspdf;
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
  const pdf    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const w      = pdf.internal.pageSize.getWidth();

  pdf.addImage(canvas.toDataURL(), 'PNG', 0, 0, w, (canvas.height / canvas.width) * w);
  pdf.save('lich-clb.pdf');
  toast('✓ Đã xuất PDF', 'ok');
}


/* ════════════════════════════════════════════════════════════
   UTILITY
   ════════════════════════════════════════════════════════════ */

// Safe HTML escaping — always use this before injecting user data into innerHTML
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}
