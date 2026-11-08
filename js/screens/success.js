/**
 * Success after the first step: the seed sprouts, the person sees what they did and how fast,
 * then is offered to save progress (registration after the action).
 */
import { h, icon, fmtTime } from '../ui.js';
import { renderTree } from '../tree.js';
import { getState } from '../state.js';
import { getGoal, goalName } from '../goals.js';
import { navigate } from '../router.js';
import { openRegister } from '../sheets/register.js';

export function SuccessScreen() {
  const s = getState();
  const fs = s.firstStep;
  const goal = getGoal(s.goalId);
  const detail = fs?.detail || {};
  const treeHost = h('div', { class: 'success-tree-svg' });
  const timers = [];

  const did = h('div', { class: 'did reveal', style: { '--d': '1.25s' } },
    h('p', { class: 'did-label' }, icon(goal.icon, 18), goalName(goal, s)),
    h('p', { class: 'did-title' }, detail.summary || goal.first.title),
    detail.chips?.length ? h('ul', { class: 'did-chips' }, detail.chips.map((c) => h('li', {}, c))) : null);

  const cta = h('button', { class: 'btn btn--primary', type: 'button' }, s.user ? 'На головну' : 'Зберегти прогрес');
  cta.addEventListener('click', () => {
    if (s.user) { navigate('/home'); return; }
    openRegister({ onDone: () => navigate('/home') });
  });

  const el = h('section', { class: 'screen screen--success' },
    h('div', { class: 'success-tree' }, h('div', { class: 'sun' }), treeHost),
    h('div', { class: 'success-copy' },
      h('h1', { class: 'display reveal', style: { '--d': '0.95s' } }, 'Твоє дерево проросло'),
      h('p', { class: 'lead reveal', style: { '--d': '1.05s' } }, 'Перший крок зроблено за ', h('b', { class: 'num' }, fmtTime(fs?.seconds || 0))),
      did),
    h('div', { class: 'success-actions reveal', style: { '--d': '1.45s' } },
      cta,
      h('p', { class: 'micro' }, 'Без пароля, приблизно 10 секунд.')));

  return {
    el,
    mounted() {
      renderTree(treeHost, { stage: 0 });
      timers.push(setTimeout(() => {
        const t = renderTree(treeHost, { stage: 1 });
        timers.push(setTimeout(() => t.celebrate(), 650));
      }, 450));
    },
    cleanup() { timers.forEach(clearTimeout); },
  };
}
