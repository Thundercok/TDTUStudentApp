/**
 * constants.js
 * Shared read-only data used across all modules.
 * Edit these if the university changes its timetable structure.
 */

// ── Member colour palette ──────────────────────────────────────
// Each member is assigned the next colour in this list (wraps around).
// Format: { c: text/border colour, bg: background colour }
const PAL = [
  { c: '#1a5c3e', bg: '#e8f5ee' },  // forest green
  { c: '#2d5a8a', bg: '#e8f0f8' },  // steel blue
  { c: '#7a3575', bg: '#f5e8f4' },  // plum
  { c: '#9b6200', bg: '#fdf3e2' },  // amber
  { c: '#4a3d8a', bg: '#edeaf8' },  // indigo
  { c: '#9b2335', bg: '#fdeef0' },  // rose
  { c: '#1e7070', bg: '#e8f6f6' },  // teal
  { c: '#5c6e00', bg: '#f3f6e0' },  // olive
];

// ── Tiết → clock time ─────────────────────────────────────────
// Maps period numbers (1–12) to their start times.
const TIME_TABLE = {
  1:  '07:00',
  2:  '07:50',
  3:  '08:40',
  4:  '09:40',
  5:  '10:30',
  6:  '11:20',
  7:  '12:30',
  8:  '13:20',
  9:  '14:10',
  10: '15:10',
  11: '16:00',
  12: '16:50',
};

// ── Day metadata ──────────────────────────────────────────────
// n = full label, s = short label for cramped views
const DAY_NAMES = [
  { n: 'Thứ 2', s: 'T2' },
  { n: 'Thứ 3', s: 'T3' },
  { n: 'Thứ 4', s: 'T4' },
  { n: 'Thứ 5', s: 'T5' },
  { n: 'Thứ 6', s: 'T6' },
];

// Maps day number → short label (used in free-slot chips)
const DAY_SHORT = { 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6' };

// ── localStorage key ───────────────────────────────────────────
// Bump this string if the saved data schema ever changes
// so old stored data is ignored instead of causing errors.
const LS_KEY = 'lichclb_v1';
