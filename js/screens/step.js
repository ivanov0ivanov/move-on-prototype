/**
 * Step screen ("Перша хвилина" or the daily step): calm elapsed indicator on top,
 * the micro-task in the middle, one primary action at the bottom.
 */
import { h, icon, vibrate } from '../ui.js';
import { getGoal, goalName } from '../goals.js';
import { getState, completeFirstStep, completeStep, setCustomTitle } from '../state.js';
import { navigate } from '../router.js';
import { stopTapCount } from '../metrics.js';
import { recordFirstStep } from '../logger.js';
import { ENGINES } from '../tasks/index.js';

export function StepScreen({ params, query }) {
  const s = getState();
  const goal = getGoal(params.goal);
  const isFirst = query.mode === 'first';
  const cfg = isFirst ? goal.first : goal.daily;
  const limit = isFirst ? 60 : 120;
  const started = performance.now();
  let finished = false;

  // v1.1: no visible digits; the calm bar is enough and the moderator logger keeps the exact time
  const timeEl = h('span', { class: 'step-spacer', 'aria-hidden': 'true' });
  const fill = h('span', { class: 'minute-fill' });
  const track = h('div', { class: 'minute-track', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(limit), 'aria-label': isFirst ? 'Перша хвилина' : 'Час кроку' }, fill);
  const titleEl = h('h1', { class: 'step-title' }, cfg.title);
  const hintEl = h('p', { class: 'step-hint' }, cfg.hint);
  const body = h('div', { class: 'step-body' });
  const primary = h('button', { class: 'btn btn--primary', type: 'button' });
  const secondary = h('button', { class: 'btn btn--text', type: 'button' });
  let onPrimary = null;
  let onSecondary = null;
  primary.addEventListener('click', () => onPrimary?.());
  secondary.addEventListener('click', () => onSecondary?.());

  const close = () => navigate(isFirst ? '/start' : '/home');

  const el = h('section', { class: `screen screen--step${isFirst ? ' is-first' : ''}` },
    h('header', { class: 'step-head' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Закрити', onClick: close }, icon('close', 22)),
      h('p', { class: 'step-label' }, isFirst ? 'Перша хвилина' : query.return ? 'Повернення' : 'Крок на сьогодні'),
      timeEl),
    track,
    h('div', { class: 'step-intro' },
      h('p', { class: 'step-goal' }, icon(goal.icon, 18), goal.id === 'custom' && isFirst ? 'Своя ціль' : goalName(goal, s)),
      titleEl,
      hintEl),
    body,
    h('footer', { class: 'step-foot' }, primary, secondary));

  function update() {
    const sec = (performance.now() - started) / 1000;
    fill.style.transform = `scaleX(${Math.min(1, sec / limit)})`;
    track.setAttribute('aria-valuenow', String(Math.floor(sec)));
    el.classList.toggle('is-over', sec >= limit);
  }
  const ticker = setInterval(update, 250);

  const api = {
    setPrimary(c) {
      primary.hidden = !c;
      if (!c) return;
      primary.textContent = c.label;
      primary.disabled = Boolean(c.disabled);
      primary.className = `btn ${c.variant === 'secondary' ? 'btn--secondary' : 'btn--primary'}`;
      onPrimary = c.onClick;
    },
    setSecondary(c) {
      secondary.hidden = !c;
      if (!c) return;
      secondary.textContent = c.label;
      onSecondary = c.onClick;
    },
    setTitle(text) { titleEl.textContent = text; },
    setHint(text) { hintEl.textContent = text; },
    onCustomTitle(title) { setCustomTitle(title); },
    complete(detail = {}) {
      if (finished) return;
      finished = true;
      vibrate(16);
      const seconds = Math.max(1, Math.round((performance.now() - started) / 1000));
      if (isFirst) {
        const { taps, sinceOpen } = stopTapCount();
        completeFirstStep({ goalId: goal.id, seconds, taps, sinceOpen, detail });
        recordFirstStep({ goal: goal.name, seconds, taps, sinceOpen });
        navigate('/success');
      } else {
        completeStep('app');
        navigate('/home');
      }
    },
  };

  const cleanupEngine = ENGINES[cfg.type](body, cfg, api, { goal, isFirst });
  update();

  return {
    el,
    cleanup() {
      clearInterval(ticker);
      cleanupEngine?.();
    },
  };
}
