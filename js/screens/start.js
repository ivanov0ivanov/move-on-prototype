/**
 * First launch: pick a goal; one tap starts its first step. No splash, no registration.
 */
import { h, icon, Logo, Version } from '../ui.js';
import { GOALS } from '../goals.js';
import { chooseGoal } from '../state.js';
import { navigate } from '../router.js';

function GoalTile(goal) {
  return h('button', {
    type: 'button',
    class: `goal-tile tint-${goal.tint}`,
    onClick: () => {
      chooseGoal(goal.id);
      navigate(`/step/${goal.id}?mode=first`);
    },
  },
  h('span', { class: 'goal-icon' }, icon(goal.icon, 26)),
  h('span', { class: 'goal-name' }, goal.name),
  h('span', { class: 'goal-meta' }, goal.first.meta));
}

export function StartScreen() {
  const el = h('section', { class: 'screen screen--start' },
    h('header', { class: 'topbar' }, Logo()),
    h('div', { class: 'start-hero' },
      h('h1', { class: 'display' }, 'Що хочеш зрушити сьогодні?'),
      h('p', { class: 'lead' }, 'Перший крок — без реєстрації. Одна хвилина.')),
    h('div', { class: 'goal-grid' }, GOALS.map(GoalTile)),
    h('footer', { class: 'start-foot' },
      h('p', {}, 'Торкнись цілі, і крок почнеться одразу.'),
      Version()));
  return { el };
}
