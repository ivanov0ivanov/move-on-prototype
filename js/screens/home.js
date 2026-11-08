/**
 * "Сьогодні" (Home): the goal tree, stats, today's step or the gentle return card,
 * the week strip and a lock-screen widget preview.
 */
import { h, icon, Logo, plural, longDate, greeting, toast, WEEKDAYS, DAY_LABEL } from '../ui.js';
import { renderTree } from '../tree.js';
import {
  getState, getStats, simNow, keyOf, addDays, dayStatus, useForgiveCards, usableCards, clearPendingAnim,
  STAGE_NAMES, CARDS_PER_MONTH,
} from '../state.js';
import { getGoal, goalName } from '../goals.js';
import { navigate, rerender } from '../router.js';
import { openRegister } from '../sheets/register.js';
import { openConfirm } from '../sheets/confirm.js';
import { openCardsInfo } from '../sheets/cards.js';

const ANIM_TOAST = {
  grow: 'Крок зараховано. Дерево виросло',
  step: 'Крок зараховано',
  recover: 'Крок зараховано. Дерево відновлюється',
  forgive: 'Картку використано. Дерево відновлюється',
  forgive2: '2 картки використано. Дерево відновлюється',
};

const seriesWord = (n) => plural(n, ['день', 'дні', 'днів']);
/** Label under the series number; a paused series keeps its number. */
const seriesLabel = (st) => (st.paused ? 'серія на паузі' : plural(st.streak, ['день у серії', 'дні в серії', 'днів у серії']));

function treeCaption(st) {
  if (st.wilt === 2) return 'Дерево привʼяло';
  if (st.wilt === 1) return 'Дерево трохи привʼяло';
  if (st.recovering) return 'Дерево відновлюється';
  return `День ${st.dayNumber} · ${st.todayDone ? 'дерево росте' : 'чекає на крок'}`;
}

function treeNote(st, s) {
  if (st.wilt) return `${st.missed} ${seriesWord(st.missed)} без кроку. Листя позеленіє з першим кроком.`;
  if (st.recovering && st.todayDone) return `Листя знову зеленіє. Серія триває: ${st.streak} ${seriesWord(st.streak)}.`;
  if (st.recovering) {
    const n = s.lastForgive?.day === st.today ? s.lastForgive.n : 1;
    return n > 1 ? 'Пропущені дні закрито картками. Серія триває.' : 'Пропущений день закрито карткою. Серія триває.';
  }
  if (st.todayDone) return 'Сьогоднішній крок зараховано.';
  return 'Сьогоднішній крок додасть дереву росту.';
}

function Stat(ico, value, label, onClick) {
  const body = [
    h('p', { class: 'stat-num' }, icon(ico, 18), h('span', {}, String(value))),
    h('p', { class: 'stat-label' }, label),
  ];
  if (!onClick) return h('div', { class: 'stat' }, body);
  return h('button', { class: 'stat stat--btn', type: 'button', onClick, 'aria-label': `${value} ${label}. Що це?` },
    body, h('span', { class: 'stat-more', 'aria-hidden': 'true' }, icon('info', 16)));
}

function WeekStrip() {
  const now = simNow();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const mondayKey = keyOf(monday);
  let kept = 0;
  const cells = WEEKDAYS.map((wd, i) => {
    const k = addDays(mondayKey, i);
    const status = dayStatus(k);
    if (status === 'done' || status === 'forgiven') kept += 1;
    const isToday = k === getStats().today;
    const inner = status === 'done' ? icon('check', 16) : status === 'forgiven' ? icon('card', 15) : null;
    return h('li', { class: `wd${isToday ? ' is-today-col' : ''}`, 'aria-label': `${wd}: ${DAY_LABEL[status]}` },
      h('span', { class: 'wd-label' }, wd),
      h('span', { class: `wd-dot is-${status}${isToday && status === 'done' ? ' is-today' : ''}` }, inner));
  });
  return h('section', { class: 'card week-card' },
    h('div', { class: 'card-head' }, h('p', { class: 'card-title' }, 'Цей тиждень'), h('p', { class: 'card-aside' }, `${kept} з 7`)),
    h('ol', { class: 'week' }, cells),
    h('div', { class: 'legend' },
      h('span', {}, h('i', { class: 'lg lg-done' }), 'крок'),
      h('span', {}, h('i', { class: 'lg lg-forgiven' }), 'картка'),
      h('span', {}, h('i', { class: 'lg lg-skipped' }), 'пропуск')));
}

export function HomeScreen() {
  const s = getState();
  const st = getStats();
  const goal = getGoal(s.goalId);
  const name = goalName(goal, s);
  const anim = s.pendingAnim;
  const timers = [];
  const treeHost = h('div', { class: 'tree-host' });
  const lockTree = h('div', { class: 'lock-tree' });
  const wilted = st.wilt > 0;

  const topRight = s.user
    ? h('span', { class: 'avatar', 'aria-label': s.user.name || 'Профіль' }, s.user.name ? s.user.name.charAt(0).toUpperCase() : icon('user', 20))
    : h('button', { class: 'pill-btn', type: 'button', onClick: () => openRegister({ onDone: rerender }) }, icon('lock', 16), 'Зберегти');

  const treeCard = h('section', { class: `tree-card${wilted ? ' is-wilted' : ''}` },
    h('div', { class: 'tree-top' },
      h('span', { class: 'tree-cap' }, treeCaption(st)),
      h('span', { class: 'tree-stage' }, STAGE_NAMES[st.stage])),
    treeHost,
    h('p', { class: 'tree-note' }, treeNote(st, s)));

  const stats = h('div', { class: 'stats' },
    Stat('flame', st.streak, seriesLabel(st)),
    Stat('steps', st.totalSteps, plural(st.totalSteps, ['крок усього', 'кроки усього', 'кроків усього'])),
    Stat('card', `${st.cardsLeft}/${CARDS_PER_MONTH}`, 'картки прощення', openCardsInfo));

  const startDaily = (ret) => navigate(`/step/${goal.id}?mode=daily${ret ? '&return=1' : ''}`);

  let action;
  if (wilted) {
    const n = usableCards(st);
    const cardLabel = n >= 2 ? `Використати ${n} картки (${n} дні)` : n === 1 ? 'Використати 1 картку (1 день)' : 'Картки прощення закінчились';
    const cardBtn = h('button', { class: 'btn btn--secondary btn--two-line', type: 'button', disabled: !n },
      h('span', {}, cardLabel),
      h('small', {}, n ? 'Одна картка = один пропущений день' : 'Нові картки зʼявляться першого числа'));
    cardBtn.addEventListener('click', () => { if (useForgiveCards(n)) rerender(); });
    const series = st.paused
      ? `Серія ${st.streak} ${seriesWord(st.streak)} на паузі. Крок сьогодні продовжить її: ${st.streak} → ${st.streak + 1}.`
      : 'Серія почнеться знову з першого кроку.';
    action = h('section', { class: 'card return-card' },
      h('p', { class: 'return-text' }, 'Дерево трохи привʼяло. Так буває. Повернутися можна за 2 хвилини.'),
      h('p', { class: 'series-note' }, icon('flame', 16), series),
      h('button', { class: 'btn btn--primary', type: 'button', onClick: () => startDaily(true) }, 'Зробити крок на 2 хв'),
      cardBtn);
  } else if (!st.todayDone) {
    action = h('section', { class: 'card step-card' },
      h('div', { class: 'step-card-head' },
        h('span', { class: `goal-icon tint-${goal.tint}` }, icon(goal.icon, 24)),
        h('div', {},
          h('p', { class: 'step-card-kicker' }, 'Крок на сьогодні'),
          h('p', { class: 'step-card-title' }, goal.daily.title),
          h('p', { class: 'step-card-meta' }, `${goal.daily.meta} · ${name}`))),
      h('div', { class: 'step-card-actions' },
        h('button', { class: 'btn btn--primary', type: 'button', onClick: () => startDaily(false) }, 'Почати'),
        h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => openConfirm({ onDone: rerender }) }, 'Уже зроблено')),
      h('p', { class: 'micro' }, '«Уже зроблено», якщо крок був поза застосунком: заняття, урок, прогулянка.'));
  } else {
    action = h('section', { class: 'card step-card is-done' },
      h('div', { class: 'step-card-head' },
        h('span', { class: 'goal-icon tint-done' }, icon('check', 24)),
        h('div', {},
          h('p', { class: 'step-card-kicker' }, 'Крок на сьогодні'),
          h('p', { class: 'step-card-title' }, 'Зроблено'),
          h('p', { class: 'step-card-meta' }, `Завтра: ${goal.daily.title.toLowerCase()} · ${goal.daily.meta}`))),
      h('button', { class: 'link-row', type: 'button', onClick: () => startDaily(false) },
        h('span', {}, 'Хочеш ще?'), h('b', {}, 'Ще один крок')));
  }

  const banner = s.user ? null : h('section', { class: 'save-banner' },
    h('span', { class: 'save-ico' }, icon('lock', 20)),
    h('p', {}, 'Прогрес поки що лише на цьому телефоні.'),
    h('button', { class: 'pill-btn pill-btn--blue', type: 'button', onClick: () => openRegister({ onDone: rerender }) }, 'Зберегти'));

  const widgetLine = wilted ? 'Дерево чекає: 2 хв' : st.todayDone ? 'Сьогодні крок зроблено' : 'Крок на сьогодні: 2 хв';
  const now = simNow();
  const widget = h('section', { class: 'widget-preview' },
    h('p', { class: 'section-title' }, 'Так виглядає віджет на екрані блокування'),
    h('div', { class: 'lock', 'aria-label': 'Макет екрана блокування' },
      h('p', { class: 'lock-date' }, longDate(now)),
      h('p', { class: 'lock-time' }, '21:40'),
      h('div', { class: 'lock-widget' }, lockTree,
        h('div', {}, h('p', { class: 'lw-title' }, widgetLine), h('p', { class: 'lw-sub' }, `${name} · день ${st.dayNumber}`)))),
    h('p', { class: 'micro' }, 'Лише макет: у прототипі віджета на телефоні немає.'));

  const el = h('section', { class: 'screen screen--home has-tabbar' },
    h('header', { class: 'topbar' }, Logo(), topRight),
    h('div', { class: 'hello' },
      h('h1', { class: 'hello-title' }, `${greeting(now)}${s.user?.name ? `, ${s.user.name}` : ''}`),
      h('p', { class: 'hello-date' }, longDate(now))),
    treeCard,
    // When the tree is wilted, the gentle return choice goes right under it, before the numbers.
    wilted ? action : stats,
    wilted ? stats : action,
    banner,
    WeekStrip(),
    widget);

  return {
    el,
    mounted() {
      if (anim) {
        renderTree(treeHost, { stage: anim.from.stage, wilt: anim.from.wilt });
        clearPendingAnim();
        timers.push(setTimeout(() => {
          const t = renderTree(treeHost, { stage: anim.to.stage, wilt: anim.to.wilt });
          timers.push(setTimeout(() => t.celebrate(), anim.kind === 'grow' ? 600 : 900));
          const key = anim.kind === 'forgive' && s.lastForgive?.n > 1 ? 'forgive2' : anim.kind;
          toast(ANIM_TOAST[key] || ANIM_TOAST.step, { iconName: anim.kind === 'forgive' ? 'card' : 'check' });
        }, 450));
      } else {
        renderTree(treeHost, { stage: st.stage, wilt: st.wilt });
      }
      renderTree(lockTree, { stage: st.stage, wilt: st.wilt, idle: false, ground: false, mini: true });
      if (getState().depositOffer === 'due') timers.push(setTimeout(() => navigate('/deposit'), anim ? 2600 : 700));
    },
    cleanup() { timers.forEach(clearTimeout); },
  };
}
