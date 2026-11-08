/**
 * Small explainer sheet for forgiveness cards (opened from the Home stat chip).
 */
import { h, icon, openSheet, dayMonth } from '../ui.js';
import { getStats, addDays, CARDS_PER_MONTH } from '../state.js';

export function openCardsInfo() {
  const st = getStats();
  const nextMonth = addDays(`${st.today.slice(0, 7)}-01`, 32).slice(0, 7);
  let sheet;
  const slots = Array.from({ length: CARDS_PER_MONTH }, (_, i) => h('span', { class: `card-slot${i < st.cardsLeft ? ' is-left' : ''}` }, icon('card', 22)));
  const content = h('div', { class: 'sheet-body' },
    h('h2', { class: 'h2' }, 'Картки прощення'),
    h('p', { class: 'cards-lead' }, 'Картка прощення закриває один пропущений день. Їх 2 на місяць. Серія й дерево зберігаються.'),
    h('div', { class: 'cards-left' },
      h('div', { class: 'card-slots', 'aria-hidden': 'true' }, slots),
      h('p', {}, h('b', {}, `Залишилось ${st.cardsLeft} з ${CARDS_PER_MONTH}`), h('span', {}, `Нові зʼявляться ${dayMonth(`${nextMonth}-01`)}`))),
    h('button', { class: 'btn btn--primary', type: 'button', onClick: () => sheet.close('done') }, 'Зрозуміло'));
  sheet = openSheet({ content, label: 'Картки прощення' });
  return sheet;
}
