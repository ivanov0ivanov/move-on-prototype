/**
 * "Сейф": deposit balance, returns, rules and history. Empty-state invitation until a deposit exists.
 */
import { h, icon, Logo, shortDate, dayMonth, openSheet, toast, ProtoNote } from '../ui.js';
import { getState, getStats, depositSummary, returnAll, WEEK_MIN_DAYS } from '../state.js';
import { navigate, rerender } from '../router.js';
import { DepositRules, Vault } from './deposit.js';

function openReturnAll(balance) {
  let sheet;
  const content = h('div', { class: 'sheet-body' },
    h('h2', { class: 'h2' }, `Забрати ${balance} грн?`),
    h('p', { class: 'sheet-sub' }, 'Гроші повернуться на картку протягом 1–3 днів (демо). Дерево, кроки й серія залишаться.'),
    h('div', { class: 'deposit-actions' },
      h('button', {
        class: 'btn btn--primary', type: 'button',
        onClick: () => { returnAll(); sheet.close('done'); rerender(); toast('Гроші повернено (демо)'); },
      }, 'Забрати все'),
      h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => sheet.close('cancel') }, 'Скасувати')),
    ProtoNote());
  sheet = openSheet({ content, label: 'Повернення депозиту' });
}

function History(s, sum) {
  const items = s.deposit.events.map((e) => ({ day: e.day, text: e.text, amount: e.kind === 'in' ? -e.amount : e.kind === 'out' ? e.amount : null, kind: e.kind }));
  sum.weekly.forEach((w) => {
    if (w.ok) items.push({ day: w.day, text: `Тиждень зараховано: ${w.kept} з 7 днів`, amount: w.amount, kind: 'week' });
    else items.push({ day: w.day, text: `Тиждень не набрав ${WEEK_MIN_DAYS} днів (${w.kept} з 7), у фонд`, amount: null, fund: w.amount, kind: 'fund' });
  });
  items.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('p', { class: 'card-title' }, 'Історія')),
    h('ul', { class: 'hist' }, items.map((it) => h('li', { class: `hist-row is-${it.kind}` },
      h('span', { class: 'hist-ico' }, icon(it.kind === 'card' ? 'card' : it.kind === 'fund' ? 'heart' : it.kind === 'in' ? 'safe' : 'coins', 18)),
      h('span', { class: 'hist-text' }, h('span', {}, it.text), h('span', { class: 'hist-day' }, dayMonth(it.day))),
      h('span', { class: 'hist-amt' }, it.amount != null ? `${it.amount > 0 ? '+' : '−'}${Math.abs(it.amount)} грн` : it.fund ? `${it.fund} грн` : '')))));
}

/** Current deposit week: 5 slots to fill, honest about whether the week can still count. */
function NextReturn(sum) {
  const slots = Array.from({ length: WEEK_MIN_DAYS }, (_, i) => h('span', { class: `w5${i < sum.weekKept ? ' is-on' : ''}` }));
  const status = sum.weekKept >= WEEK_MIN_DAYS
    ? `Тиждень уже набрав ${WEEK_MIN_DAYS} днів. Повернення ${shortDate(sum.nextDay)}.`
    : sum.weekReachable
      ? `Зараз ${sum.weekKept} з ${WEEK_MIN_DAYS} днів. Тиждень закінчується ${shortDate(sum.nextDay)}.`
      : `Зараз ${sum.weekKept} з ${WEEK_MIN_DAYS} днів, до ${shortDate(sum.nextDay)} вже не набрати. Пропущені дні можна закрити картками, інакше ${sum.part} грн піде у фонд.`;
  return h('section', { class: 'card next-card' },
    h('span', { class: 'next-ico' }, icon('coins', 22)),
    h('div', {},
      h('p', { class: 'next-title' }, `Наступне повернення: ${sum.part} грн, якщо цей тиждень набере ${WEEK_MIN_DAYS} днів`),
      h('div', { class: 'w5-row', 'aria-hidden': 'true' }, slots),
      h('p', { class: 'next-sub' }, status)));
}

function Empty(st, sum) {
  const ready = st.streak >= 3;
  return [
    h('section', { class: 'safe-empty' },
      Vault(),
      h('h2', { class: 'h2 center' }, sum?.status === 'returned' ? `Повернено ${sum.returned} грн` : 'Тут можна поставити на себе'),
      h('p', { class: 'muted center' }, sum?.status === 'returned'
        ? 'Сейф порожній. Покласти суму знову можна будь-коли, коли буде серія з 3 днів.'
        : `Невелика сума, 100–300 грн. Вона повертається щотижня, коли в тижні є ${WEEK_MIN_DAYS} днів із кроками. Відкривається після 3 днів поспіль.`),
      ready
        ? h('button', { class: 'btn btn--primary', type: 'button', onClick: () => navigate('/deposit') }, 'Додати суму в сейф')
        : h('div', { class: 'unlock' },
          h('div', { class: 'unlock-bar' }, h('span', { style: { transform: `scaleX(${Math.min(1, st.streak / 3)})` } })),
          h('p', { class: 'micro center' }, `Серія зараз: ${st.streak} з 3`))),
    DepositRules(),
    ProtoNote(),
  ];
}

export function SafeScreen() {
  const s = getState();
  const st = getStats();
  const sum = depositSummary();
  const active = sum?.status === 'active';

  const content = active ? [
    h('section', { class: 'safe-card' },
      h('p', { class: 'safe-kicker' }, icon('safe', 18), 'У сейфі'),
      h('p', { class: 'safe-amount' }, `${sum.balance} грн`),
      h('p', { class: 'safe-sub' }, `з ${sum.amount} грн · банк-партнер (демо)`),
      h('div', { class: 'safe-bar' }, h('span', { style: { transform: `scaleX(${sum.returned / sum.amount})` } })),
      h('div', { class: 'safe-split' },
        h('p', {}, h('b', {}, `${sum.returned} грн`), h('span', {}, 'повернуто')),
        h('p', {}, h('b', {}, `${sum.fund} грн`), h('span', {}, 'у фонд')))),
    sum.nextDay ? NextReturn(sum) : null,
    DepositRules(),
    History(s, sum),
    h('button', { class: 'btn btn--outline', type: 'button', onClick: () => openReturnAll(sum.balance) }, icon('undo', 20), 'Забрати все'),
    ProtoNote(),
  ] : Empty(st, sum);

  const el = h('section', { class: 'screen screen--safe has-tabbar' },
    h('header', { class: 'topbar' }, Logo()),
    h('h1', { class: 'page-title' }, 'Сейф'),
    content);
  return { el };
}
