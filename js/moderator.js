/**
 * Hidden moderator panel: demo scenarios (simulated days) and the usability-test logger.
 * Opened by long-pressing the logo (~1 s) or triple-tapping the version label.
 */
import { h, icon, openSheet, toast, fmtTime, dayMonth } from './ui.js';
import { getState, getStats, resetAll, rewindToDay, skipTwoDays, nextDay, todayKey } from './state.js';
import {
  TASKS, OUTCOMES, currentSession, currentCode, setParticipant, toggleTask, resetTaskTimer, setTaskField,
  taskElapsed, downloadCsv, clearAll, allSessions,
} from './logger.js';
import { navigate } from './router.js';
import { startTapCount } from './metrics.js';
import { getGoal } from './goals.js';

const PARTICIPANTS = ['Р1', 'Р2', 'Р3', 'Р4', 'Р5', 'Р6', 'Р7', 'Р8'];
let active = null;

function seg(values, current, onPick, { labels } = {}) {
  return h('div', { class: 'svc-seg' }, values.map((v, i) => h('button', {
    type: 'button', class: String(current) === String(v) ? 'on' : '',
    onClick: () => onPick(String(current) === String(v) ? '' : v),
  }, labels ? labels[i] : String(v))));
}

export function openModerator() {
  if (active) return;
  const openTasks = new Set();
  let confirmClear = false;
  const body = h('div', { class: 'svc' });

  const go = (path) => { active?.close('nav'); navigate(path); };

  function scenario(label, sub, fn) {
    return h('button', { type: 'button', class: 'svc-btn', onClick: fn }, h('span', {}, label), sub ? h('small', {}, sub) : null);
  }

  function renderScenario() {
    const s = getState();
    const st = getStats();
    const dep = s.deposit ? `ставка ${s.deposit.amount} грн` : `пропозиція: ${s.depositOffer}`;
    return h('section', { class: 'svc-sec' },
      h('p', { class: 'svc-title' }, 'Сценарій'),
      h('p', { class: 'svc-status' }, st.started
        ? `День ${st.dayNumber} · серія ${st.streak}${st.paused ? ' (пауза)' : ''} · стадія ${st.stage} · вʼянення ${st.wilt} · ${dayMonth(todayKey())}${s.dayOffset ? ` (+${s.dayOffset} дн.)` : ''} · ${dep}`
        : 'Новий користувач: перший крок ще не зроблено'),
      h('div', { class: 'svc-grid' },
        scenario('Скинути все', 'новий користувач', () => {
          resetAll();
          startTapCount();
          go('/start');
          toast('Стан скинуто. Лічильник дотиків запущено', { iconName: 'undo' });
        }),
        scenario('Перемотати → День 3', 'пропозиція депозиту після кроку', () => { rewindToDay(3); go('/home'); }),
        scenario('Перемотати → День 5', null, () => { rewindToDay(5); go('/home'); }),
        scenario('Перемотати → День 7', 'плоди після кроку', () => { rewindToDay(7); go('/home'); }),
        scenario('Пропустити 2 дні', 'вʼянення', () => {
          if (!getState().startDay) { toast('Спершу потрібен перший крок', { iconName: 'info' }); return; }
          skipTwoDays();
          go('/home');
        }),
        scenario('Наступний день', '+1 день', () => {
          if (!getState().startDay) { toast('Спершу потрібен перший крок', { iconName: 'info' }); return; }
          nextDay();
          go('/home');
        }),
        scenario('Показати пропозицію депозиту', 'одразу', () => go('/deposit'))));
  }

  function renderTask(t, session) {
    const r = session.tasks[t.no];
    const set = (field) => (v) => { setTaskField(t.no, field, v); render(); };
    const outcome = OUTCOMES.find(([k]) => k === r.outcome);
    const det = h('details', { class: 'svc-task', open: openTasks.has(t.no) },
      h('summary', {},
        h('span', { class: 'svc-task-name' }, `${t.no}. ${t.name}`),
        h('span', { class: 'svc-task-meta' }, h('span', { class: `svc-timer${r.startedAt ? ' is-on' : ''}`, dataset: { task: String(t.no) } }, fmtTime(taskElapsed(r) / 1000)), outcome ? ` · ${outcome[1]}` : '')),
      h('div', { class: 'svc-task-body' },
        h('div', { class: 'svc-row' },
          h('button', { type: 'button', class: `svc-mini${r.startedAt ? ' is-stop' : ''}`, onClick: () => { toggleTask(t.no); render(); } }, icon(r.startedAt ? 'pause' : 'play', 16), r.startedAt ? 'Стоп' : 'Старт'),
          h('button', { type: 'button', class: 'svc-mini svc-mini--ghost', onClick: () => { resetTaskTimer(t.no); render(); } }, 'Скинути час')),
        h('p', { class: 'svc-label' }, 'Результат'),
        seg(OUTCOMES.map(([k]) => k), r.outcome, set('outcome'), { labels: OUTCOMES.map(([, l]) => l) }),
        h('p', { class: 'svc-label' }, 'Рівень допомоги'),
        seg([0, 1, 2], r.help, set('help')),
        h('p', { class: 'svc-label' }, 'Легкість, 1–5'),
        seg([1, 2, 3, 4, 5], r.ease, set('ease')),
        t.extra ? h('p', { class: 'svc-label' }, `${t.extraLabel}, 1–5`) : null,
        t.extra ? seg([1, 2, 3, 4, 5], r[t.extra], set(t.extra)) : null,
        h('p', { class: 'svc-label' }, 'Цитата учасника'),
        h('textarea', {
          class: 'svc-input', rows: '2', placeholder: 'Дослівно, що сказав(-ла)',
          onInput: (e) => setTaskField(t.no, 'quote', e.target.value),
        }, r.quote)));
    det.addEventListener('toggle', () => { if (det.open) openTasks.add(t.no); else openTasks.delete(t.no); });
    return det;
  }

  function renderLogger() {
    const session = currentSession();
    const code = currentCode();
    const fs = session?.firstStep || null;
    const appFs = getState().firstStep;
    const custom = h('input', { class: 'svc-input svc-code', type: 'text', placeholder: 'Інший код', maxlength: '8', value: code && !PARTICIPANTS.includes(code) ? code : '' });
    custom.addEventListener('change', () => { setParticipant(custom.value); render(); });

    return h('section', { class: 'svc-sec' },
      h('p', { class: 'svc-title' }, 'Тест-сесія'),
      h('div', { class: 'svc-chips' },
        PARTICIPANTS.map((p) => h('button', { type: 'button', class: p === code ? 'on' : '', onClick: () => { setParticipant(p); render(); } }, p)),
        custom),
      session
        ? h('p', { class: 'svc-status' }, fs
          ? `Перший крок (авто): ${fmtTime(fs.seconds)} · ${fs.taps} дотиків · від відкриття ${fmtTime(fs.sinceOpen)} · ${fs.goal}`
          : 'Перший крок (авто): запишеться, коли учасник натисне «Готово». Перед стартом натисни «Скинути все».')
        : h('p', { class: 'svc-status' }, appFs
          ? `Останній перший крок: ${fmtTime(appFs.seconds)} · ${appFs.taps} дотиків · ${getGoal(appFs.goalId).name}. Обери учасника, щоб вести лог.`
          : 'Обери код учасника, щоб вести лог.'),
      session ? h('div', { class: 'svc-tasks' }, TASKS.map((t) => renderTask(t, session))) : null,
      h('div', { class: 'svc-row svc-row--end' },
        h('button', { type: 'button', class: 'svc-mini', disabled: !allSessions().length, onClick: () => downloadCsv() }, 'Export CSV'),
        h('button', {
          type: 'button', class: `svc-mini svc-mini--danger${confirmClear ? ' is-armed' : ''}`, disabled: !allSessions().length,
          onClick: () => {
            if (!confirmClear) { confirmClear = true; render(); return; }
            clearAll();
            confirmClear = false;
            render();
            toast('Дані тестів очищено', { iconName: 'undo' });
          },
        }, confirmClear ? 'Натисни ще раз' : 'Очистити дані тестів')),
      h('p', { class: 'svc-foot' }, `Учасників у журналі: ${allSessions().length}. CSV: UTF-8, роздільник «;».`));
  }

  function render() {
    body.replaceChildren(
      h('div', { class: 'svc-head' },
        h('div', {}, h('p', { class: 'svc-kicker' }, 'Службова панель'), h('p', { class: 'svc-h' }, 'Для модератора тесту')),
        h('button', { type: 'button', class: 'svc-close', 'aria-label': 'Закрити', onClick: () => active?.close('close') }, icon('close', 20))),
      renderScenario(),
      renderLogger());
  }

  render();
  const ticker = setInterval(() => {
    const session = currentSession();
    if (!session) return;
    body.querySelectorAll('.svc-timer').forEach((el) => {
      el.textContent = fmtTime(taskElapsed(session.tasks[el.dataset.task]) / 1000);
    });
  }, 500);

  active = openSheet({
    content: body,
    className: 'sheet--service',
    label: 'Службова панель модератора',
    onClose: () => { clearInterval(ticker); active = null; },
  });
}
