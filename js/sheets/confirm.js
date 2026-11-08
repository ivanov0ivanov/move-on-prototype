/**
 * "Як зарахувати крок?" — confirming a real-world step in one tap. Integrations are imitated.
 */
import { h, icon, openSheet } from '../ui.js';
import { getState, completeStep } from '../state.js';
import { getGoal } from '../goals.js';

/**
 * @param {{onDone?: () => void}} [opts]
 */
export function openConfirm({ onDone } = {}) {
  const goal = getGoal(getState().goalId);
  let sheet;
  let busy = false;

  const options = [
    { method: 'auto', ico: 'sync', title: 'Автоматично: Apple Health / Duolingo (демо)', sub: `Підтягнемо ${goal.offline.auto}, нічого не треба вводити` },
    { method: 'photo', ico: 'camera', title: 'Фото', sub: 'Килимок, квиток чи сторінка. У прототипі камера не відкривається' },
    { method: 'mark', ico: 'mark', title: 'Просто відмітити', sub: 'Ми тобі довіряємо' },
  ];

  function choose(opt, row) {
    if (busy) return;
    busy = true;
    row.classList.add('is-busy');
    const status = row.querySelector('.opt-sub');
    const ms = opt.method === 'auto' ? 1100 : opt.method === 'photo' ? 700 : 250;
    if (opt.method === 'auto') status.textContent = `Шукаємо в ${goal.offline.auto}…`;
    if (opt.method === 'photo') status.textContent = 'Фото додано (демо)';
    setTimeout(() => {
      if (opt.method === 'auto') status.textContent = `Знайдено: ${goal.offline.found}`;
      row.classList.remove('is-busy');
      row.classList.add('is-ok');
      setTimeout(() => {
        completeStep(opt.method);
        sheet.close('done');
        onDone?.();
      }, opt.method === 'auto' ? 650 : 300);
    }, ms);
  }

  const list = h('div', { class: 'opt-list' }, options.map((opt) => {
    const row = h('button', { type: 'button', class: 'opt' },
      h('span', { class: 'opt-ico' }, icon(opt.ico, 24)),
      h('span', { class: 'opt-text' }, h('span', { class: 'opt-title' }, opt.title), h('span', { class: 'opt-sub' }, opt.sub)),
      h('span', { class: 'opt-state' }, icon('check', 18)));
    row.addEventListener('click', () => choose(opt, row));
    return row;
  }));

  const content = h('div', { class: 'sheet-body' },
    h('h2', { class: 'h2' }, 'Як зарахувати крок?'),
    h('p', { class: 'sheet-sub' }, `Наприклад, ${goal.offline.label}. Обери спосіб, вистачить одного дотику.`),
    list);
  sheet = openSheet({ content, label: 'Підтвердження кроку' });
  return sheet;
}
