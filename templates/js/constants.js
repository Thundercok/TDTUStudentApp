/**
 * constants.js
 * Shared read-only data used across all modules.
 * Edit these if the university changes its timetable structure.
 */

// ── Member colour palette ──────────────────────────────────────
// c = solid block background (white text will sit on top)
// bg = light tint used only for avatar backgrounds in the member list
const PAL = [
  { c: '#1a6e3c', bg: '#c8ecd8' },  // emerald
  { c: '#1e4f9c', bg: '#c5d9f5' },  // cobalt
  { c: '#8c2080', bg: '#f0c8ee' },  // violet
  { c: '#b85c00', bg: '#fad9a8' },  // burnt orange
  { c: '#1a7070', bg: '#b8e8e8' },  // teal
  { c: '#9c1a35', bg: '#f5c8d4' },  // crimson
  { c: '#4a3daa', bg: '#d0caf5' },  // indigo
  { c: '#5c7000', bg: '#ddf0a0' },  // olive
];

// ── Tiết → clock time ─────────────────────────────────────────
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
// Includes Saturday (day 7)
const DAY_NAMES = [
  { n: 'Thứ 2', s: 'T2' },
  { n: 'Thứ 3', s: 'T3' },
  { n: 'Thứ 4', s: 'T4' },
  { n: 'Thứ 5', s: 'T5' },
  { n: 'Thứ 6', s: 'T6' },
  { n: 'Thứ 7', s: 'T7' },
];

const DAY_SHORT = { 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6', 7: 'T7' };

// ── localStorage key ───────────────────────────────────────────
const LS_KEY = 'lichclb_v1';
