/**
 * Moderated usability-test logger: participant sessions, per-task timers and ratings, CSV export.
 * Stored separately from app state so "reset" scenarios never erase test data.
 */

const KEY = 'moveon.tests.v1';

export const TASKS = [
  { no: 1, name: 'Перший крок' },
  { no: 2, name: 'Знайти прогрес' },
  { no: 3, name: 'Підтвердити крок' },
  { no: 4, name: 'Рішення щодо депозиту', extra: 'trust', extraLabel: 'Довіра' },
  { no: 5, name: 'Повернення після пропуску', extra: 'calm', extraLabel: 'Спокій' },
];

export const OUTCOMES = [['success', 'успіх'], ['partial', 'частково'], ['fail', 'невдача']];

let data = read();

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { current: null, sessions: {} };
}

function write() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

const blankTask = () => ({ elapsedMs: 0, startedAt: null, outcome: '', help: '', ease: '', trust: '', calm: '', quote: '' });

export const currentCode = () => data.current;
export const allSessions = () => Object.values(data.sessions);

/** @returns {object|null} the active participant session */
export function currentSession() {
  return data.current ? data.sessions[data.current] || null : null;
}

/** Selects (and creates if needed) a participant session, e.g. "Р3". */
export function setParticipant(code) {
  const c = code.trim();
  if (!c) return;
  if (!data.sessions[c]) {
    data.sessions[c] = { code: c, createdAt: new Date().toISOString(), firstStep: null, tasks: Object.fromEntries(TASKS.map((t) => [t.no, blankTask()])) };
  }
  data.current = c;
  write();
}

export function taskElapsed(task) {
  return task.elapsedMs + (task.startedAt ? Date.now() - task.startedAt : 0);
}

export function toggleTask(no) {
  const s = currentSession();
  if (!s) return;
  const t = s.tasks[no];
  if (t.startedAt) {
    t.elapsedMs += Date.now() - t.startedAt;
    t.startedAt = null;
  } else {
    t.startedAt = Date.now();
  }
  write();
}

export function resetTaskTimer(no) {
  const s = currentSession();
  if (!s) return;
  Object.assign(s.tasks[no], { elapsedMs: 0, startedAt: null });
  write();
}

export function setTaskField(no, field, value) {
  const s = currentSession();
  if (!s) return;
  s.tasks[no][field] = value;
  write();
}

/** Auto-logged metrics of the first step (seconds, taps) for the active participant. */
export function recordFirstStep(metrics) {
  const s = currentSession();
  if (!s) return;
  s.firstStep = metrics;
  write();
}

export function clearAll() {
  data = { current: null, sessions: {} };
  write();
}

const csvCell = (v) => {
  const str = v == null ? '' : String(v);
  return /[";\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

/** Builds a CSV (semicolon-separated for Excel with a Ukrainian locale): one row per participant × task. */
function buildCsv() {
  const head = ['participant', 'task_no', 'task', 'duration_s', 'outcome', 'help_level', 'ease_1_5', 'trust_1_5', 'calm_1_5', 'quote',
    'first_step_goal', 'first_step_s', 'first_step_taps', 'first_step_since_open_s', 'session_started'];
  const rows = [head];
  for (const s of allSessions()) {
    for (const t of TASKS) {
      const r = s.tasks[t.no] || blankTask();
      const out = OUTCOMES.find(([k]) => k === r.outcome);
      rows.push([
        s.code, t.no, t.name, Math.round(taskElapsed(r) / 1000) || '', out ? out[1] : '', r.help, r.ease,
        t.extra === 'trust' ? r.trust : '', t.extra === 'calm' ? r.calm : '', r.quote,
        s.firstStep?.goal ?? '', s.firstStep?.seconds ?? '', s.firstStep?.taps ?? '', s.firstStep?.sinceOpen ?? '', s.createdAt,
      ]);
    }
  }
  return rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
}

/** Downloads the CSV as UTF-8 with BOM. */
export function downloadCsv() {
  const blob = new Blob(['﻿', buildCsv()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `move-on-tests-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
