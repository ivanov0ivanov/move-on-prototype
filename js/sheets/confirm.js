/**
 * "Як зарахувати крок?" — confirming a real-world step. Integrations are imitated.
 * The first automatic check asks for (imitated) permission; a found lesson is credited only on an explicit tap.
 */
import { h, icon, openSheet, ProtoNote } from '../ui.js';
import { getState, completeStep, allowAuto } from '../state.js';
import { getGoal } from '../goals.js';

/**
 * @param {{onDone?: () => void}} [opts]
 */
export function openConfirm({ onDone } = {}) {
  const goal = getGoal(getState().goalId);
  let sheet;
  let busy = false;
  const body = h('div', { class: 'sheet-body' });

  const options = [
    { method: 'auto', ico: 'sync', title: 'Автоматично: Apple Health / Duolingo (демо)', sub: `Підтягнемо ${goal.offline.auto}, нічого не треба вводити` },
    { method: 'photo', ico: 'camera', title: 'Фото', sub: 'Килимок, квиток чи сторінка. У прототипі камера не відкривається' },
    { method: 'mark', ico: 'mark', title: 'Просто відмітити', sub: 'Ми тобі довіряємо' },
  ];

  const finish = (method) => {
    completeStep(method);
    sheet.close('done');
    onDone?.();
  };

  function runAuto(row, rows) {
    busy = true;
    rows.forEach((r) => { if (r !== row) r.disabled = true; });
    row.classList.add('is-busy');
    const status = row.querySelector('.opt-sub');
    status.textContent = `Шукаємо в ${goal.offline.auto}…`;
    setTimeout(() => {
      row.classList.remove('is-busy');
      row.classList.add('is-ok');
      status.textContent = `Знайдено: ${goal.offline.found}`;
      body.append(h('div', { class: 'found-actions' },
        h('button', { class: 'btn btn--primary', type: 'button', onClick: () => finish('auto') }, 'Зарахувати крок'),
        h('button', { class: 'btn btn--text', type: 'button', onClick: () => sheet.close('cancel') }, 'Скасувати')));
    }, 1100);
  }

  function runQuick(opt, row) {
    busy = true;
    row.classList.add('is-busy');
    if (opt.method === 'photo') row.querySelector('.opt-sub').textContent = 'Фото додано (демо)';
    setTimeout(() => {
      row.classList.remove('is-busy');
      row.classList.add('is-ok');
      setTimeout(() => finish(opt.method), 300);
    }, opt.method === 'photo' ? 700 : 250);
  }

  function renderOptions({ note = '', autoStart = false } = {}) {
    busy = false;
    const rows = options.map((opt) => {
      const row = h('button', { type: 'button', class: 'opt', dataset: { method: opt.method } },
        h('span', { class: 'opt-ico' }, icon(opt.ico, 24)),
        h('span', { class: 'opt-text' }, h('span', { class: 'opt-title' }, opt.title), h('span', { class: 'opt-sub' }, opt.sub)),
        h('span', { class: 'opt-state' }, icon('check', 18)));
      row.addEventListener('click', () => {
        if (busy) return;
        if (opt.method !== 'auto') { runQuick(opt, row); return; }
        if (getState().autoAllowed) runAuto(row, rows); else renderPermission();
      });
      return row;
    });
    // replaceChildren() would print a literal "null", so optional nodes are filtered out.
    body.replaceChildren(...[
      h('h2', { class: 'h2' }, 'Як зарахувати крок?'),
      h('p', { class: 'sheet-sub' }, `Наприклад, ${goal.offline.label}. Обери спосіб.`),
      note && h('p', { class: 'later-note' }, icon('info', 16), note),
      h('div', { class: 'opt-list' }, rows),
    ].filter(Boolean));
    if (autoStart) runAuto(rows[0], rows);
  }

  function renderPermission() {
    body.replaceChildren(
      h('div', { class: 'perm' },
        h('span', { class: 'perm-ico' }, icon('sync', 28)),
        h('h2', { class: 'h2' }, 'Дозволити MOVE ON бачити уроки Duolingo і тренування Apple Health?'),
        h('p', { class: 'sheet-sub' }, 'Лише факт заняття й тривалість.')),
      h('div', { class: 'deposit-actions' },
        h('button', { class: 'btn btn--primary', type: 'button', onClick: () => { allowAuto(true); renderOptions({ autoStart: true }); } }, 'Дозволити (демо)'),
        h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => renderOptions({ note: 'Без доступу крок можна підтвердити фото або просто відмітити.' }) }, 'Ні')),
      ProtoNote('Прототип: справжнього доступу до Duolingo й Apple Health немає'));
  }

  renderOptions();
  sheet = openSheet({ content: body, label: 'Підтвердження кроку' });
  return sheet;
}
