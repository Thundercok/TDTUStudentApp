/**
 * main.js
 * Shared mutable state, cached DOM references,
 * all event listener wiring, and boot sequence.
 *
 * Load order: constants → storage → ui → calendar → main
 */


/* ════════════════════════════════════════════════════════════
   SHARED STATE
   These are written by multiple modules, so they live here
   as window-scoped variables (accessible everywhere).
   ════════════════════════════════════════════════════════════ */

let members     = [];   // Array of member objects
let allClasses  = [];   // Merged flat list of all classes
let freeSlots   = [];   // Slots where all visible members are free
let pendingFile = null; // File object waiting to be added


/* ════════════════════════════════════════════════════════════
   DOM REFERENCES
   Cache every element that is accessed more than once.
   ════════════════════════════════════════════════════════════ */

const panel       = document.getElementById('panel');
const overlay     = document.getElementById('drawerOverlay');
const drawerClose = document.getElementById('drawerClose');
const ml          = document.getElementById('ml');
const dz          = document.getElementById('dz');
const fi          = document.getElementById('fi');
const ni          = document.getElementById('ni');
const ba          = document.getElementById('ba');
const pw          = document.getElementById('pw');
const pi          = document.getElementById('pi');


/* ════════════════════════════════════════════════════════════
   FILE UPLOAD — drop zone + file input
   ════════════════════════════════════════════════════════════ */

dz.addEventListener('click', () => fi.click());

dz.addEventListener('dragover', e => {
  e.preventDefault();
  dz.classList.add('drag');
});
dz.addEventListener('dragleave', () => dz.classList.remove('drag'));

dz.addEventListener('drop', e => {
  e.preventDefault();
  dz.classList.remove('drag');
  if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
});

fi.addEventListener('change', () => {
  if (fi.files[0]) setFile(fi.files[0]);
  fi.value = ''; // reset so the same file can be re-selected
});

function setFile(f) {
  pendingFile = f;
  pi.src = URL.createObjectURL(f);
  pw.style.display = 'block';
  ni.focus();
  checkReady();
}


/* ════════════════════════════════════════════════════════════
   NAME INPUT
   ════════════════════════════════════════════════════════════ */

ni.addEventListener('input', checkReady);
ni.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !ba.disabled) addMember();
});

// Enable/disable the Add button based on whether both name + file are ready
function checkReady() {
  ba.disabled = !(pendingFile && ni.value.trim());
}


/* ════════════════════════════════════════════════════════════
   ADD MEMBER
   ════════════════════════════════════════════════════════════ */

ba.addEventListener('click', addMember);

async function addMember() {
  const name = ni.value.trim();
  if (!name || !pendingFile) return;

  // Pick next colour from palette (wraps around)
  const colorIndex = members.length % PAL.length;
  const m = {
    id:      Date.now(),
    name,
    c:       PAL[colorIndex].c,
    bg:      PAL[colorIndex].bg,
    classes: [],
    hidden:  false,
    status:  'busy',
  };

  members.push(m);

  // Snapshot the file and reset the form immediately
  const file  = pendingFile;
  pendingFile = null;
  pw.style.display = 'none';
  ni.value = '';
  ba.disabled = true;

  renderMemberList();
  toast('Đang đọc lịch của ' + name + '…');
  if (isMobile()) closeDrawer();

  // Send image to server for parsing
  const b64 = await toBase64(file);
  try {
    const res = await fetch('/api/parse-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: b64, name }),
    });
    const d = await res.json();

    if (d.success) {
      m.classes = d.data;
      m.status  = 'ok';
      m.savedAt = Date.now();
      toast('✓ ' + d.data.length + ' môn — ' + name, 'ok');
    } else {
      m.status = 'err';
      toast('Lỗi: ' + d.error, 'err');
    }
  } catch {
    m.status = 'err';
    toast('Lỗi kết nối', 'err');
  }

  renderMemberList();
  merge();
  save();
}

// Convert a File to base64 data URL
function toBase64(f) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.readAsDataURL(f);
  });
}


/* ════════════════════════════════════════════════════════════
   FILTER STRIP  — wire up data-filter buttons
   ════════════════════════════════════════════════════════════ */

document.getElementById('fs').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  applyFilter(btn.dataset.filter, btn);
});


/* ════════════════════════════════════════════════════════════
   DRAWER  — wiring
   ════════════════════════════════════════════════════════════ */

document.getElementById('drawerToggle').addEventListener('click', openDrawer);
document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);
document.getElementById('drawerCloseBtn').addEventListener('click', closeDrawer);

window.addEventListener('resize', () => {
  if (!isMobile()) closeDrawer();
});


/* ════════════════════════════════════════════════════════════
   MOBILE BOTTOM NAV
   ════════════════════════════════════════════════════════════ */

document.getElementById('navAdd').addEventListener('click', openDrawer);
document.getElementById('navCal').addEventListener('click', () => mobTab('cal'));
document.getElementById('navFree').addEventListener('click', () => mobTab('free'));


/* ════════════════════════════════════════════════════════════
   EXPORT  — wire panel buttons
   ════════════════════════════════════════════════════════════ */

document.getElementById('btnPNG').addEventListener('click', expPNG);
document.getElementById('btnPDF').addEventListener('click', expPDF);


/* ════════════════════════════════════════════════════════════
   SERVICE WORKER
   ════════════════════════════════════════════════════════════ */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}


/* ════════════════════════════════════════════════════════════
   BOOT
   ════════════════════════════════════════════════════════════ */

renderStorageBar();
load(); // restore any previously saved member data
