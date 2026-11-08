/**
 * Day-3 offer: optional deposit ("Поставиш на себе?") with concrete rules, an explicit confirmation sheet
 * and an equal-weight "Не зараз".
 */
import { h, icon, plural, shortDate, toast, openSheet, ProtoNote } from '../ui.js';
import {
  getState, getStats, acceptDeposit, setDepositOffer, depositSummary,
  DEPOSIT_AMOUNTS, DEPOSIT_PARTS, CARDS_PER_MONTH, WEEK_MIN_DAYS, CANCEL_HOURS,
} from '../state.js';
import { navigate } from '../router.js';

/** The stake rules: the single source of rule copy for the offer, the confirmation sheet and the Сейф tab. */
export const DEPOSIT_RULES = [
  ['bank', 'Гроші лежать на окремому рахунку банку-партнера. Назву банку й договір покажемо перед першим внеском (у прототипі демо).'],
  ['coins', `Ставка на ${DEPOSIT_PARTS} тижні: щотижня повертається 1/${DEPOSIT_PARTS} суми, якщо в тижні ${WEEK_MIN_DAYS} днів із кроками.`],
  ['card', `День без кроку можна закрити карткою прощення: ${CARDS_PER_MONTH} на місяць, одна картка = один день.`],
  ['heart', `Якщо тиждень не набрав ${WEEK_MIN_DAYS} днів, його 1/${DEPOSIT_PARTS} іде у фонд, який ти обереш.`],
  ['undo', `Передумати можна протягом ${CANCEL_HOURS} годин після внеску: повернемо все. Далі гроші повертаються лише за цими правилами.`],
];

export function DepositRules() {
  return h('section', { class: 'rules' },
    h('p', { class: 'rules-title' }, 'Як це працює'),
    h('ul', { class: 'rules-list' }, DEPOSIT_RULES.map(([ico, text]) => h('li', {}, h('span', { class: 'rule-ico' }, icon(ico, 20)), h('span', {}, text)))));
}

/** Vault illustration; `drop` animates a coin falling into it. */
export function Vault({ drop = false } = {}) {
  return h('div', {
    class: `vault${drop ? ' vault--drop' : ''}`,
    'aria-hidden': 'true',
    html: `<svg viewBox="0 0 160 150">
      <ellipse cx="80" cy="140" rx="54" ry="6" fill="#ECE6D4"/>
      <rect x="24" y="34" width="112" height="100" rx="22" fill="#1C1B2E"/>
      <rect x="34" y="44" width="92" height="80" rx="16" fill="#2A2942"/>
      <rect x="62" y="38" width="36" height="5" rx="2.5" fill="#0F0E1C"/>
      <g class="vault-dial"><circle cx="80" cy="84" r="20" fill="#F2C230"/><circle cx="80" cy="84" r="7" fill="#1C1B2E"/>
      <path d="M80 64v8M80 96v8M60 84h8M92 84h8" stroke="#1C1B2E" stroke-width="3" stroke-linecap="round"/></g>
      <rect x="42" y="132" width="16" height="7" rx="3" fill="#1C1B2E"/><rect x="102" y="132" width="16" height="7" rx="3" fill="#1C1B2E"/>
      <g class="vault-coin"><circle cx="80" cy="18" r="13" fill="#F2C230"/><circle cx="80" cy="18" r="9" fill="none" stroke="#D69E12" stroke-width="2"/>
      <text x="80" y="23" text-anchor="middle" font-size="13" font-weight="700" fill="#8A6400" font-family="Onest, system-ui">₴</text></g>
    </svg>`,
  });
}

function Confirmation(amount) {
  const sum = depositSummary();
  return h('div', { class: 'deposit-done' },
    Vault({ drop: true }),
    h('h1', { class: 'display center' }, `${amount} грн у сейфі`),
    h('p', { class: 'lead center' }, `Перше повернення: ${sum.part} грн, ${shortDate(sum.nextDay)}, якщо тиждень набере ${WEEK_MIN_DAYS} днів із кроками.`),
    h('ul', { class: 'done-list' },
      h('li', {}, icon('coins', 20), `${sum.part} грн повертається за кожен тиждень із ${WEEK_MIN_DAYS} днями кроків`),
      h('li', {}, icon('card', 20), `Картка прощення закриває один день, ${CARDS_PER_MONTH} на місяць`),
      h('li', {}, icon('undo', 20), `Передумати можна протягом ${CANCEL_HOURS} годин: повернемо все`)),
    h('div', { class: 'deposit-actions' },
      h('button', { class: 'btn btn--primary', type: 'button', onClick: () => navigate('/safe') }, 'Відкрити сейф'),
      h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => navigate('/home') }, 'На головну')),
    ProtoNote());
}

/**
 * "Підтвердь внесок": the last explicit check before money moves (imitated).
 * @param {number} amount
 * @param {() => void} onConfirm
 */
function openDepositConfirm(amount, onConfirm) {
  const part = Math.round(amount / DEPOSIT_PARTS);
  let sheet;
  const content = h('div', { class: 'sheet-body' },
    h('h2', { class: 'h2' }, 'Підтвердь внесок'),
    h('div', { class: 'confirm-amount' },
      h('p', { class: 'confirm-sum' }, `${amount} грн`),
      h('p', { class: 'confirm-sub' }, `повернення по ${part} грн щотижня, ${DEPOSIT_PARTS} тижні · банк-партнер (демо)`)),
    h('p', { class: 'terms-title' }, 'Умови'),
    h('ul', { class: 'terms' }, DEPOSIT_RULES.map(([ico, text]) => h('li', {}, icon(ico, 18), h('span', {}, text)))),
    // Sticky footer: both choices stay visible while the terms scroll, also on small phones.
    h('div', { class: 'deposit-actions sticky-actions' },
      h('button', { class: 'btn btn--primary', type: 'button', onClick: () => { sheet.close('done'); onConfirm(); } }, 'Підтвердити (демо)'),
      h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => sheet.close('back') }, 'Назад'),
      ProtoNote()));
  sheet = openSheet({ content, label: 'Підтвердження внеску' });
}

export function DepositScreen() {
  const s = getState();
  const st = getStats();
  if (s.depositOffer === 'due' || s.depositOffer === 'none') setDepositOffer('shown');
  let amount = null;

  const badge = st.streak >= 3 ? `${st.streak} ${plural(st.streak, ['день', 'дні', 'днів'])} поспіль` : '3 дні поспіль';
  const primary = h('button', { class: 'btn btn--primary', type: 'button', disabled: true }, 'Обери суму');
  const chips = DEPOSIT_AMOUNTS.map((a) => h('button', {
    type: 'button', class: 'amount', role: 'radio', 'aria-checked': 'false',
    onClick: () => {
      amount = a;
      chips.forEach((c) => {
        const on = c.dataset.amount === String(a);
        c.classList.toggle('on', on);
        c.setAttribute('aria-checked', String(on));
      });
      primary.disabled = false;
      primary.textContent = `Покласти ${a} грн у сейф`;
    },
    dataset: { amount: String(a) },
  }, h('span', { class: 'amount-num' }, String(a)), h('span', { class: 'amount-cur' }, 'грн')));

  const offer = h('div', { class: 'deposit-offer' },
    h('span', { class: 'streak-badge' }, icon('flame', 18), badge),
    h('h1', { class: 'display' }, 'Поставиш на себе?'),
    h('p', { class: 'lead' }, `Поклади невелику суму в сейф. Вона повертається тобі щотижня, коли в тижні є ${WEEK_MIN_DAYS} днів із кроками.`),
    h('div', { class: 'amounts', role: 'radiogroup', 'aria-label': 'Сума внеску' }, chips),
    DepositRules(),
    // Sticky footer: «Покласти…» and «Не зараз» are always visible and equally sized (no hidden decline).
    h('div', { class: 'deposit-actions sticky-actions' },
      primary,
      h('button', {
        class: 'btn btn--secondary', type: 'button',
        onClick: () => {
          setDepositOffer('declined');
          navigate('/home');
          toast('Добре. Сейф чекатиме у вкладці «Сейф»', { iconName: 'safe' });
        },
      }, 'Не зараз'),
      ProtoNote()));

  const el = h('section', { class: 'screen screen--deposit' }, offer);
  primary.addEventListener('click', () => {
    if (!amount) return;
    openDepositConfirm(amount, () => {
      acceptDeposit(amount);
      el.replaceChildren(Confirmation(amount));
      el.scrollTop = 0;
    });
  });
  return { el };
}
