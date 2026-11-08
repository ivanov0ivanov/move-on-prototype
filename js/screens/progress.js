/**
 * "Прогрес": totals, month calendar of steps and skips, tree history by stage.
 */
import { h, icon, Logo, Version, plural, monthTitle, dayMonth, WEEKDAYS, DAY_LABEL } from '../ui.js';
import { renderTree } from '../tree.js';
import { getState, getStats, simNow, keyOf, addDays, dayStatus, diffDays, STAGE_BY_DONE, STAGE_NAMES } from '../state.js';

/** Day on which each stage was first reached (by counting completed days). */
function stageHistory(s, maxStage) {
  const out = [{ stage: 0, day: s.startDay }];
  if (!s.startDay) return out;
  const done = Object.entries(s.days).filter(([, v]) => v.status === 'done').map(([k]) => k).sort();
  done.forEach((k, i) => {
    const stage = STAGE_BY_DONE[Math.min(i + 1, STAGE_BY_DONE.length - 1)];
    if (stage > out[out.length - 1].stage && stage <= maxStage) out.push({ stage, day: k });
  });
  return out;
}

function Calendar(s) {
  const now = simNow();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const today = keyOf(now);
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(h('li', { class: 'cal-cell is-empty', 'aria-hidden': 'true' }));
  for (let d = 1; d <= daysInMonth; d++) {
    const k = addDays(keyOf(first), d - 1);
    const status = dayStatus(k, s);
    cells.push(h('li', { class: `cal-cell is-${status}${k === today ? ' is-today' : ''}`, 'aria-label': `${d}: ${DAY_LABEL[status]}` },
      h('span', {}, String(d))));
  }
  return h('section', { class: 'card cal-card' },
    h('div', { class: 'card-head' }, h('p', { class: 'card-title' }, monthTitle(now))),
    h('ol', { class: 'cal-grid cal-head', 'aria-hidden': 'true' }, WEEKDAYS.map((w) => h('li', {}, w))),
    h('ol', { class: 'cal-grid' }, cells),
    h('div', { class: 'legend' },
      h('span', {}, h('i', { class: 'lg lg-done' }), 'крок'),
      h('span', {}, h('i', { class: 'lg lg-forgiven' }), 'картка прощення'),
      h('span', {}, h('i', { class: 'lg lg-skipped' }), 'пропуск')));
}

export function ProgressScreen() {
  const s = getState();
  const st = getStats();
  const history = stageHistory(s, st.stage);
  const hosts = [];

  const historyRow = h('ol', { class: 'stage-row' }, history.map(({ stage, day }) => {
    const host = h('div', { class: 'stage-tree' });
    hosts.push([host, stage]);
    return h('li', { class: 'stage-item' }, host,
      h('p', { class: 'stage-name' }, STAGE_NAMES[stage]),
      day ? h('p', { class: 'stage-day' }, stage === 0 ? 'старт' : `день ${diffDays(s.startDay, day) + 1}`) : null,
      day ? h('p', { class: 'stage-day' }, dayMonth(day)) : null);
  }));
  const nextStage = st.stage < 6 ? STAGE_NAMES[st.stage + 1] : null;

  const el = h('section', { class: 'screen screen--progress has-tabbar' },
    h('header', { class: 'topbar' }, Logo()),
    h('h1', { class: 'page-title' }, 'Прогрес'),
    h('div', { class: 'stats stats--big' },
      h('div', { class: 'stat' }, h('p', { class: 'stat-num' }, icon('steps', 18), h('span', {}, String(st.totalSteps))), h('p', { class: 'stat-label' }, plural(st.totalSteps, ['крок усього', 'кроки усього', 'кроків усього']))),
      h('div', { class: 'stat' }, h('p', { class: 'stat-num' }, icon('flame', 18), h('span', {}, String(st.best))), h('p', { class: 'stat-label' }, 'найкраща серія')),
      h('div', { class: 'stat' }, h('p', { class: 'stat-num' }, icon('today', 18), h('span', {}, String(st.streak))), h('p', { class: 'stat-label' }, st.paused ? 'поточна серія, на паузі' : 'поточна серія'))),
    Calendar(s),
    h('section', { class: 'card history-card' },
      h('div', { class: 'card-head' }, h('p', { class: 'card-title' }, 'Як росте дерево'), nextStage ? h('p', { class: 'card-aside' }, `далі: ${nextStage.toLowerCase()}`) : null),
      historyRow),
    h('footer', { class: 'app-foot' }, h('span', {}, 'MOVE ON · прототип'), Version()));

  return {
    el,
    mounted() {
      hosts.forEach(([host, stage]) => renderTree(host, { stage, idle: false, mini: true }));
      historyRow.scrollLeft = historyRow.scrollWidth;
    },
  };
}
