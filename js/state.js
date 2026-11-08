/**
 * App state: persisted in localStorage, a simulated calendar (day offset for demos),
 * derived stats (stage, wilt, streak) and all state-changing actions.
 */

const KEY = 'moveon.state.v1';

/** Tree stage by number of days with a completed step (index = days, capped). */
export const STAGE_BY_DONE = [0, 1, 2, 3, 4, 4, 5, 6];
export const STAGE_NAMES = ['Насінина', 'Паросток', 'Росток', 'Деревце', 'Молоде дерево', 'Повна крона', 'Перші плоди'];
export const CARDS_PER_MONTH = 2;
/** One forgiveness card closes up to this many most recent missed days. */
export const CARD_COVERS_DAYS = 2;
/** Deposit is returned in this many weekly parts. */
export const DEPOSIT_PARTS = 4;
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
 * @returns {{started:boolean,today:string,stage:number,wilt:number,streak:number,best:number,doneCount:number,
 *   totalSteps:number,todayDone:boolean,missed:number,dayNumber:number,cardsLeft:number,recovering:boolean}}
 */
export function getStats(s = state) {
  const today = todayKey();
  const used = s.cardsUsed[today.slice(0, 7)] || 0;
  const cardsLeft = Math.max(0, CARDS_PER_MONTH - used);
  const base = { started: false, today, stage: 0, wilt: 0, streak: 0, best: 0, doneCount: 0, totalSteps: s.totalSteps, todayDone: false, missed: 0, dayNumber: 0, cardsLeft, recovering: false };
  if (!s.startDay || diffDays(s.startDay, today) < 0) return base;

  const kept = (k) => Boolean(s.days[k]);
  const todayDone = s.days[today]?.status === 'done';

  let missed = 0;
  for (let k = addDays(today, -1); diffDays(s.startDay, k) >= 0 && !kept(k); k = addDays(k, -1)) missed++;

  let streak = 0;
  for (let k = kept(today) ? today : addDays(today, -1); kept(k); k = addDays(k, -1)) streak++;

  let best = 0;
  let run = 0;
  for (let k = s.startDay; diffDays(k, today) >= 0; k = addDays(k, 1)) {
    run = kept(k) ? run + 1 : 0;
    best = Math.max(best, run);
  }

  const doneCount = Object.entries(s.days).filter(([k, v]) => v.status === 'done' && diffDays(k, today) >= 0).length;
  return {
    ...base,
    started: true,
    stage: STAGE_BY_DONE[Math.min(doneCount, STAGE_BY_DONE.length - 1)],
    wilt: todayDone ? 0 : Math.min(2, missed),
    streak,
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
 * Weekly return math for the deposit: each 7-day block returns 1/DEPOSIT_PARTS of the amount
 * proportionally to kept days (done or forgiven); the rest of that part goes to charity.
 */
export function depositSummary(s = state) {
  const d = s.deposit;
  if (!d) return null;
  const end = d.status === 'returned' ? d.closedDay : todayKey();
  const part = Math.round(d.amount / DEPOSIT_PARTS);
  const weeksDone = Math.min(DEPOSIT_PARTS, Math.max(0, Math.floor(diffDays(d.startDay, end) / 7)));
  let returned = 0;
  let charity = 0;
  const weekly = [];
  for (let w = 0; w < weeksDone; w++) {
    let kept = 0;
    for (let i = 0; i < 7; i++) if (s.days[addDays(d.startDay, w * 7 + i)]) kept++;
    const back = Math.round((part * kept) / 7);
    returned += back;
    charity += part - back;
    weekly.push({ day: addDays(d.startDay, (w + 1) * 7), back, charity: part - back, kept });
  }
  const paidOut = d.events.filter((e) => e.kind === 'out').reduce((sum, e) => sum + e.amount, 0);
  const balance = d.status === 'returned' ? 0 : d.amount - returned - charity;
  const nextDay = d.status === 'active' && weeksDone < DEPOSIT_PARTS ? addDays(d.startDay, (weeksDone + 1) * 7) : null;
  return { amount: d.amount, part, returned: returned + paidOut, charity, balance, nextDay, weekly, status: d.status };
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

/** Uses one forgiveness card for the most recent missed days. Returns false if not possible. */
export function useForgiveCard() {
  const before = getStats();
  if (!before.cardsLeft || !before.missed) return false;
  mutate((s) => {
    const today = todayKey();
    const n = Math.min(before.missed, CARD_COVERS_DAYS);
    for (let i = 1; i <= n; i++) s.days[addDays(today, -i)] = { status: 'forgiven' };
    const month = today.slice(0, 7);
    s.cardsUsed[month] = (s.cardsUsed[month] || 0) + 1;
    s.recoveredOn = today;
    s.pendingAnim = { from: { stage: before.stage, wilt: before.wilt }, to: { stage: before.stage, wilt: 0 }, kind: 'forgive' };
    if (hasActiveDeposit(s)) s.deposit.events.push({ day: today, kind: 'card', text: 'Пропуск закрито карткою прощення' });
  });
  return true;
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
