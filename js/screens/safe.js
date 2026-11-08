/**
 * "Сейф": deposit balance, returns, rules and history. Empty-state invitation until a deposit exists.
 */
import { h, icon, Logo, shortDate, dayMonth, openSheet, toast, ProtoNote } from '../ui.js';
import { getState, getStats, depositSummary, returnAll } from '../state.js';
import { navigate, rerender } from '../router.js';
import { DepositRules, Vault } from './deposit.js';

function openReturnAll(balance) {
  let sheet;
  const content = h('div', { class: 'sheet-body' },
    h('h2', { class: 'h2' }, `Повернути ${balance} грн?`),
    h('p', { class: 'sheet-sub' }, 'Гроші повернуться на картку протягом 1–3 днів (демо). Дерево, кроки й серія залишаться.'),
    h('div', { class: 'deposit-actions' },
      h('button', {
        class: 'btn btn--primary', type: 'button',
        onClick: () => { returnAll(); sheet.close('done'); rerender(); toast('Гроші повернено (демо)'); },
      }, 'Повернути все'),
      h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => sheet.close('cancel') }, 'Скасувати')),
    ProtoNote());
  sheet = openSheet({ content, label: 'Повернення депозиту' });
}

function History(s, sum) {
  const items = s.deposit.events.map((e) => ({ day: e.day, text: e.text, amount: e.kind === 'in' ? -e.amount : e.kind === 'out' ? e.amount : null, kind: e.kind }));
  sum.weekly.forEach((w) => {
    items.push({ day: w.day, text: `Повернуто за тиждень (${w.kept} з 7 днів)`, amount: w.back, kind: 'week' });
    if (w.charity) items.push({ day: w.day, text: 'На благодійність за пропуски', amount: null, charity: w.charity, kind: 'charity' });
  });
  items.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('p', { class: 'card-title' }, 'Історія')),
    h('ul', { class: 'hist' }, items.map((it) => h('li', { class: `hist-row is-${it.kind}` },
      h('span', { class: 'hist-ico' }, icon(it.kind === 'card' ? 'card' : it.kind === 'charity' ? 'heart' : it.kind === 'in' ? 'safe' : 'coins', 18)),
      h('span', { class: 'hist-text' }, h('span', {}, it.text), h('span', { class: 'hist-day' }, dayMonth(it.day))),
      h('span', { class: 'hist-amt' }, it.amount != null ? `${it.amount > 0 ? '+' : '−'}${Math.abs(it.amount)} грн` : it.charity ? `${it.charity} грн` : '')))));
}

function Empty(st, sum) {
  const ready = st.streak >= 3;
  return [
    h('section', { class: 'safe-empty' },
      Vault(),
      h('h2', { class: 'h2 center' }, sum?.status === 'returned' ? `Повернено ${sum.returned} грн` : 'Тут можна додати цілі ваги'),
      h('p', { class: 'muted center' }, sum?.status === 'returned'
        ? 'Сейф порожній. Додати суму знову можна будь-коли, коли буде серія з 3 днів.'
        : 'Невелика сума, 100–300 грн, яка повертається тобі за кроки. Відкривається після 3 днів поспіль.'),
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
        h('p', {}, h('b', {}, `${sum.charity} грн`), h('span', {}, 'на благодійність')))),
    h('section', { class: 'card next-card' },
      h('span', { class: 'next-ico' }, icon('coins', 22)),
      h('div', {},
        h('p', { class: 'next-title' }, `Наступне повернення: ${sum.part} грн`),
        h('p', { class: 'next-sub' }, `${shortDate(sum.nextDay)}, якщо тиждень пройде з кроками. Картка прощення закриває пропуск.`))),
    DepositRules(),
    History(s, sum),
    h('button', { class: 'btn btn--outline', type: 'button', onClick: () => openReturnAll(sum.balance) }, icon('undo', 20), 'Повернути все'),
    ProtoNote(),
  ] : Empty(st, sum);

  const el = h('section', { class: 'screen screen--safe has-tabbar' },
    h('header', { class: 'topbar' }, Logo()),
    h('h1', { class: 'page-title' }, 'Сейф'),
    content);
  return { el };
}
