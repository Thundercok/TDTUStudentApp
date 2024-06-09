/**
 * main.js
 * Shared mutable state, cached DOM references,
 * all event listener wiring, and boot sequence.
 *
 * Load order: constants → config → storage → ui → upload → calendar → gsheets → main
 */


/* ════════════════════════════════════════════════════════════
   SHARED STATE
   Written by multiple modules — kept here as globals.
   ════════════════════════════════════════════════════════════ */

let members    = [];   // Array of member objects
let allClasses = [];   // Merged flat list of all visible classes
let freeSlots  = [];   // Slots where every visible member is free


/* ════════════════════════════════════════════════════════════
   DOM REFERENCES  (cached for performance)
   ════════════════════════════════════════════════════════════ */

const panel       = document.getElementById('panel');
const overlay     = document.getElementById('drawerOverlay');
const drawerClose = document.getElementById('drawerClose');
const ml          = document.getElementById('ml');
const ni          = document.getElementById('ni');
const ba          = document.getElementById('ba');


/* ════════════════════════════════════════════════════════════
   ADD MEMBER
   "Thêm" button — collects data from whichever upload tab
   is active, then calls the server (if needed) and saves.
   ════════════════════════════════════════════════════════════ */

ba.addEventListener('click', addMember);
ni.addEventListener('input', checkAddReady); // re-check when name changes
ni.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !ba.disabled) addMember();
});

async function addMember() {
  const name = ni.value.trim();
  if (!name) return;

  // Pick next colour from palette
  const ci = members.length % PAL.length;
  const m  = {
    id:      Date.now(),
    name,
    c:       PAL[ci].c,
    bg:      PAL[ci].bg,
    classes: [],
    hidden:  false,
    status:  'busy',
  };

  members.push(m);
  ni.value = '';
  ba.disabled = true;

  renderMemberList();
  toast('Đang đọc lịch của ' + name + '…');
  if (isMobile()) closeDrawer();

  try {
    m.classes = await collectClasses(name); // from upload.js
    m.status  = 'ok';
    m.savedAt = Date.now();
    toast(`✓ ${m.classes.length} môn — ${name}`, 'ok');
  } catch (e) {
    m.status = 'err';
    toast('Lỗi: ' + (e.message || 'Không xác định'), 'err');
  }

  resetUploadState();    // from upload.js
  renderMemberList();
  merge();
  save();
}


/* ════════════════════════════════════════════════════════════
   FILTER STRIP  (event delegation)
   ════════════════════════════════════════════════════════════ */

document.getElementById('fs').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  applyFilter(btn.dataset.filter, btn); // from calendar.js
});


/* ════════════════════════════════════════════════════════════
   DRAWER  (mobile sidebar)
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
   EXPORT BUTTONS
   ════════════════════════════════════════════════════════════ */

document.getElementById('btnPNG').addEventListener('click', expPNG);
document.getElementById('btnPDF').addEventListener('click', expPDF);
document.getElementById('btnSheets').addEventListener('click', exportToSheets);


/* ════════════════════════════════════════════════════════════
   SERVICE WORKER
   ════════════════════════════════════════════════════════════ */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}


/* ════════════════════════════════════════════════════════════
   BOOT  — initialise sub-modules then load saved data
   ════════════════════════════════════════════════════════════ */

initUploadTabs();   // from upload.js — wire tab switcher
initImageTab();     // from upload.js
initManualTab();    // from upload.js — populate tiết selects
initCsvTab();       // from upload.js
initTextTab();      // from upload.js

initGoogleApi();    // from gsheets.js — start gapi load

renderStorageBar(); // from storage.js
load();             // from storage.js — restore saved member data
