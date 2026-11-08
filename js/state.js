/**
 * App state: persisted in localStorage, a simulated calendar (day offset for demos),
 * derived stats (stage, wilt, streak) and all state-changing actions.
 */

const KEY = 'moveon.state.v1';

/** Tree stage by number of days with a completed step (index = days, capped). */
export const STAGE_BY_DONE = [0, 1, 2, 3, 4, 4, 5, 6];
export const STAGE_NAMES = ['Насінина', 'Паросток', 'Росток', 'Деревце', 'Молоде дерево', 'Повна крона', 'Перші плоди'];
/** Forgiveness cards per calendar month; one card closes exactly one missed day. */
export const CARDS_PER_MONTH = 2;
/** A series survives up to this many missed days in a row (≈48 h); it restarts after a longer gap. */
export const GRACE_DAYS = 2;
/** Deposit is returned in this many weekly parts. */
export const DEPOSIT_PARTS = 4;
/** A deposit week counts (its part is returned) if it has at least this many days with a step or a card. */
export const WEEK_MIN_DAYS = 5;
export const DEPOSIT_AMOUNTS = [100, 200, 300];

const blank = () => ({
  v: 1,
  dayOffset: 0,
  goalId: null,
  customTitle: '',
  user: null,
  startDay: null,
  days: {},
  totalSteps: 0,
  cardsUsed: {},
  deposit: null,
  depositOffer: 'none', // none | due | shown | declined | accepted
  firstStep: null,
  recoveredOn: null,
  lastForgive: null, // { day, n } — cards used today, for Home copy
  autoAllowed: false, // imitated Duolingo / Apple Health permission
  pendingAnim: null,
});

let state = read();

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...blank(), ...JSON.parse(raw) };
  } catch { /* storage unavailable: fall back to memory */ }
  return blank();
}

function write() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore quota/private mode */ }
}

function mutate(fn) {
  fn(state);
  write();
}

export const getState = () => state;

/* ---------- simulated calendar ---------- */

const pad = (n) => String(n).padStart(2, '0');
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(k, n) {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}
/** Whole days from `a` to `b` (b - a). */
export const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);

/** Simulated "now": real clock shifted by the demo day offset. */
export function simNow() {
  const d = new Date();
  d.setDate(d.getDate() + state.dayOffset);
  return d;
}
export const todayKey = () => keyOf(simNow());

/* ---------- derived stats ---------- */

/**
 * Derived progress values for the current simulated day.
 *
 * Series rule: `streak` counts days with a step. A forgiveness card bridges a missed day (no increment);
 * up to GRACE_DAYS missed days in a row only pause the series; a longer gap restarts it.
 * @returns {{started:boolean,today:string,stage:number,wilt:number,streak:number,paused:boolean,graceLeft:number,
 *   best:number,doneCount:number,totalSteps:number,todayDone:boolean,missed:number,dayNumber:number,
 *   cardsLeft:number,recovering:boolean}}
 */
export function getStats(s = state) {
  const today = todayKey();
  const used = s.cardsUsed[today.slice(0, 7)] || 0;
  const cardsLeft = Math.max(0, CARDS_PER_MONTH - used);
  const base = {
    started: false, today, stage: 0, wilt: 0, streak: 0, paused: false, graceLeft: GRACE_DAYS, best: 0, doneCount: 0,
    totalSteps: s.totalSteps, todayDone: false, missed: 0, dayNumber: 0, cardsLeft, recovering: false,
  };
  if (!s.startDay || diffDays(s.startDay, today) < 0) return base;

  const kept = (k) => Boolean(s.days[k]);
  const todayDone = s.days[today]?.status === 'done';

  let missed = 0;
  for (let k = addDays(today, -1); diffDays(s.startDay, k) >= 0 && !kept(k); k = addDays(k, -1)) missed++;

  let run = 0;
  let best = 0;
  let gap = 0;
  for (let k = s.startDay; diffDays(k, today) >= 0; k = addDays(k, 1)) {
    const status = s.days[k]?.status;
    if (status === 'done') {
      run += 1;
      gap = 0;
    } else if (status === 'forgiven') {
      gap = 0;
    } else if (k !== today) {
      gap += 1;
      if (gap > GRACE_DAYS) run = 0;
    }
    best = Math.max(best, run);
  }

  const doneCount = Object.entries(s.days).filter(([k, v]) => v.status === 'done' && diffDays(k, today) >= 0).length;
  return {
    ...base,
    started: true,
    stage: STAGE_BY_DONE[Math.min(doneCount, STAGE_BY_DONE.length - 1)],
    wilt: todayDone ? 0 : Math.min(2, missed),
    streak: run,
    paused: !todayDone && gap > 0 && run > 0,
    graceLeft: Math.max(0, GRACE_DAYS - gap),
    best,
    doneCount,
    todayDone,
    missed,
    dayNumber: diffDays(s.startDay, today) + 1,
    recovering: s.recoveredOn === today,
  };
}

/** Status of a calendar day: done | forgiven | skipped | today | future | before. */
export function dayStatus(k, s = state) {
  const today = todayKey();
  if (s.days[k]) return s.days[k].status;
  if (!s.startDay || diffDays(s.startDay, k) < 0) return k === today ? 'today' : 'before';
  const d = diffDays(k, today);
  if (d === 0) return 'today';
  return d > 0 ? 'skipped' : 'future';
}

export const hasActiveDeposit = (s = state) => s.deposit?.status === 'active';

/**
 * Weekly return math for the deposit: each 7-day block from the deposit day is one week.
 * A week with ≥ WEEK_MIN_DAYS kept days (step or card) returns 1/DEPOSIT_PARTS of the amount;
 * otherwise that part goes to the fund the person chose.
 */
export function depositSummary(s = state) {
  const d = s.deposit;
  if (!d) return null;
  const today = todayKey();
  const end = d.status === 'returned' ? d.closedDay : today;
  const part = Math.round(d.amount / DEPOSIT_PARTS);
  const keptIn = (from, n) => {
    let c = 0;
    for (let i = 0; i < n; i++) if (s.days[addDays(from, i)]) c++;
    return c;
  };
  const weeksDone = Math.min(DEPOSIT_PARTS, Math.max(0, Math.floor(diffDays(d.startDay, end) / 7)));
  let returned = 0;
  let fund = 0;
  const weekly = [];
  for (let w = 0; w < weeksDone; w++) {
    const kept = keptIn(addDays(d.startDay, w * 7), 7);
    const ok = kept >= WEEK_MIN_DAYS;
    if (ok) returned += part; else fund += part;
    weekly.push({ day: addDays(d.startDay, (w + 1) * 7), kept, ok, amount: part });
  }
  const paidOut = d.events.filter((e) => e.kind === 'out').reduce((sum, e) => sum + e.amount, 0);
  const running = d.status === 'active' && weeksDone < DEPOSIT_PARTS;
  const weekStart = addDays(d.startDay, weeksDone * 7);
  const elapsed = running ? Math.min(7, diffDays(weekStart, today) + 1) : 0;
  const weekKept = running ? keptIn(weekStart, elapsed) : 0;
  const weekLeft = running ? 7 - elapsed : 0;
  return {
    amount: d.amount, part, returned: returned + paidOut, fund, weekly, status: d.status,
    balance: d.status === 'returned' ? 0 : d.amount - returned - fund,
    nextDay: running ? addDays(d.startDay, (weeksDone + 1) * 7) : null,
    weekKept, weekLeft, weekReachable: weekKept + weekLeft >= WEEK_MIN_DAYS,
  };
}

/* ---------- actions ---------- */

function recordStep(s, day, method) {
  const prev = s.days[day];
  s.days[day] = { status: 'done', method, steps: (prev?.status === 'done' ? prev.steps : 0) + 1 };
  s.totalSteps += 1;
}

export function chooseGoal(goalId) {
  mutate((s) => { s.goalId = goalId; });
}

export function setCustomTitle(title) {
  mutate((s) => { s.customTitle = title; });
}

/**
 * Records the very first step (before any registration).
 * @param {{goalId:string, seconds:number, taps:number, sinceOpen:number, detail:object}} m
 */
export function completeFirstStep(m) {
  mutate((s) => {
    const today = todayKey();
    s.goalId = m.goalId;
    s.startDay = s.startDay || today;
    recordStep(s, today, 'app');
    s.firstStep = { ...m, at: Date.now() };
  });
}

/**
 * Records a regular step and queues the matching tree animation for Home.
 * @param {'app'|'auto'|'photo'|'mark'} method
 */
export function completeStep(method) {
  const before = getStats();
  mutate((s) => {
    const today = todayKey();
    if (!s.startDay) s.startDay = today;
    recordStep(s, today, method);
    if (before.wilt > 0) s.recoveredOn = today;
    const after = getStats(s);
    s.pendingAnim = {
      from: { stage: before.stage, wilt: before.wilt },
      to: { stage: after.stage, wilt: after.wilt },
      kind: before.wilt > 0 ? 'recover' : after.stage > before.stage ? 'grow' : 'step',
    };
    if (after.streak >= 3 && s.depositOffer === 'none' && !hasActiveDeposit(s)) s.depositOffer = 'due';
  });
}

/** How many cards can be used right now: one per missed day, limited by the cards left. */
export const usableCards = (st = getStats()) => Math.min(st.cardsLeft, st.missed);

/**
 * Uses forgiveness cards for the most recent missed days, one card per day.
 * @param {number} n cards requested
 * @returns {number} cards actually used (0 if not possible)
 */
export function useForgiveCards(n) {
  const before = getStats();
  const count = Math.min(n, usableCards(before));
  if (count < 1) return 0;
  mutate((s) => {
    const today = todayKey();
    for (let i = 1; i <= count; i++) s.days[addDays(today, -i)] = { status: 'forgiven' };
    const month = today.slice(0, 7);
    s.cardsUsed[month] = (s.cardsUsed[month] || 0) + count;
    s.recoveredOn = today;
    s.lastForgive = { day: today, n: count };
    s.pendingAnim = { from: { stage: before.stage, wilt: before.wilt }, to: { stage: before.stage, wilt: 0 }, kind: 'forgive' };
    if (hasActiveDeposit(s)) {
      s.deposit.events.push({ day: today, kind: 'card', text: count === 1 ? 'Пропущений день закрито карткою' : `${count} пропущені дні закрито картками` });
    }
  });
  return count;
}

export function allowAuto(allowed) {
  mutate((s) => { s.autoAllowed = allowed; });
}

export const clearPendingAnim = () => mutate((s) => { s.pendingAnim = null; });

export function register(name, method) {
  mutate((s) => { s.user = { name, method }; });
}

export function setDepositOffer(status) {
  mutate((s) => { s.depositOffer = status; });
}

export function acceptDeposit(amount) {
  mutate((s) => {
    const today = todayKey();
    s.deposit = { amount, startDay: today, status: 'active', events: [{ day: today, kind: 'in', amount, text: `Покладено ${amount} грн` }] };
    s.depositOffer = 'accepted';
  });
}

export function returnAll() {
  const sum = depositSummary();
  if (!sum || sum.status !== 'active') return;
  mutate((s) => {
    const today = todayKey();
    s.deposit.events.push({ day: today, kind: 'out', amount: sum.balance, text: `Повернуто все: ${sum.balance} грн` });
    s.deposit.status = 'returned';
    s.deposit.closedDay = today;
  });
}

/* ---------- moderator scenarios ---------- */

export function resetAll() {
  state = blank();
  write();
}

/**
 * Rebuilds history so that today is day `n` with days 1..n-1 completed and today's step pending.
 * Keeps the user, the goal and an active deposit (re-anchored to day 3).
 */
export function rewindToDay(n) {
  mutate((s) => {
    const today = todayKey();
    const start = addDays(today, -(n - 1));
    s.goalId = s.goalId || 'english';
    s.startDay = start;
    s.days = {};
    for (let i = 0; i < n - 1; i++) s.days[addDays(start, i)] = { status: 'done', method: 'app', steps: 1 };
    s.totalSteps = n - 1;
    s.cardsUsed = {};
    s.recoveredOn = null;
    s.lastForgive = null;
    s.pendingAnim = null;
    if (hasActiveDeposit(s) && n > 3) {
      const shift = diffDays(s.deposit.startDay, addDays(start, 2));
      s.deposit.startDay = addDays(s.deposit.startDay, shift);
      s.deposit.events.forEach((e) => { e.day = addDays(e.day, shift); });
    } else {
      s.deposit = null;
      if (s.depositOffer !== 'declined' || n <= 3) s.depositOffer = 'none';
    }
  });
}

/** Moves the simulated date so that exactly two full days are missed. */
export function skipTwoDays() {
  mutate((s) => { s.dayOffset += s.days[todayKey()] ? 3 : 2; s.pendingAnim = null; });
}

export function nextDay() {
  mutate((s) => { s.dayOffset += 1; s.pendingAnim = null; });
}
