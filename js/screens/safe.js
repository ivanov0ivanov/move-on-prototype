/**
 * "Сейф": the 4-week stake: balance, weekly returns, rules and history. Within 24 h of the deposit
 * the stake can be cancelled; afterwards it is locked. Empty-state invitation until a deposit exists.
 */
import { h, icon, Logo, shortDate, dayMonth, openSheet, toast, ProtoNote } from '../ui.js';
import { getState, getStats, depositSummary, cancelDeposit, WEEK_MIN_DAYS, DEPOSIT_PARTS, CANCEL_HOURS } from '../state.js';
import { navigate, rerender } from '../router.js';
import { DepositRules, Vault } from './deposit.js';

/** "ще 23 год" / "ще 40 хв" for the cancel window. */
const leftLabel = (ms) => (ms >= 3600e3 ? `ще ${Math.floor(ms / 3600e3)} год` : `ще ${Math.max(1, Math.ceil(ms / 60e3))} хв`);

function openCancel(amount) {
  let sheet;
  const content = h('div', { class: 'sheet-body' },
    h('h2', { class: 'h2' }, `Передумати й повернути ${amount} грн?`),
    h('p', { class: 'sheet-sub' }, `Від внеску минуло менше ${CANCEL_HOURS} годин, тож повернемо всю суму на картку (демо). Сейф стане порожнім. Дерево, кроки й серія залишаться.`),
    h('div', { class: 'deposit-actions' },
      h('button', {
        class: 'btn btn--primary', type: 'button',
        onClick: () => {
          if (cancelDeposit()) toast(`Повернуто ${amount} грн (демо)`, { iconName: 'undo' });
          sheet.close('done');
          rerender();
        },
      }, `Так, повернути ${amount} грн`),
      h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => sheet.close('cancel') }, 'Залишити ставку')),
    ProtoNote());
  sheet = openSheet({ content, label: 'Скасування ставки' });
}

/** Cancel button inside the 24-hour window, otherwise the locked-stake line. */
function StakeStatus(sum) {
  if (sum.canCancel) {
    return h('section', { class: 'cancel-box' },
      h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => openCancel(sum.amount) }, icon('undo', 20), 'Передумати й повернути все'),
      h('p', { class: 'micro center' }, `Можна протягом ${CANCEL_HOURS} годин після внеску: ${leftLabel(sum.cancelLeftMs)}`));
  }
  return h('p', { class: 'stake-note' }, icon('lock', 18),
    `Гроші заблоковано до ${dayMonth(sum.lockedUntil)}; повертаються щотижня за правилами.`);
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

function Empty(st) {
  const ready = st.streak >= 3;
  return [
    h('section', { class: 'safe-empty' },
      Vault(),
      h('h2', { class: 'h2 center' }, 'Тут можна поставити на себе'),
      h('p', { class: 'muted center' }, `Невелика ставка, 100–300 грн, на ${DEPOSIT_PARTS} тижні. Щотижня повертається 1/${DEPOSIT_PARTS}, коли в тижні є ${WEEK_MIN_DAYS} днів із кроками. Відкривається після 3 днів поспіль.`),
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

  const content = sum ? [
    h('section', { class: 'safe-card' },
      h('p', { class: 'safe-kicker' }, icon('safe', 18), 'У сейфі'),
      h('p', { class: 'safe-amount' }, `${sum.balance} грн`),
      h('p', { class: 'safe-sub' }, `з ${sum.amount} грн · банк-партнер (демо)`),
      h('div', { class: 'safe-bar' }, h('span', { style: { transform: `scaleX(${sum.returned / sum.amount})` } })),
      h('div', { class: 'safe-split' },
        h('p', {}, h('b', {}, `${sum.returned} грн`), h('span', {}, 'повернуто')),
        h('p', {}, h('b', {}, `${sum.fund} грн`), h('span', {}, 'у фонд')))),
    StakeStatus(sum),
    sum.nextDay ? NextReturn(sum) : null,
    DepositRules(),
    History(s, sum),
    ProtoNote(),
  ] : Empty(st);

  const el = h('section', { class: 'screen screen--safe has-tabbar' },
    h('header', { class: 'topbar' }, Logo()),
    h('h1', { class: 'page-title' }, 'Сейф'),
    content);
  return { el };
}
