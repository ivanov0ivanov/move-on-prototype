/**
 * Guided breathing (e.g. 4-4-6) with an expanding circle and phase labels.
 */
import { h, vibrate } from '../ui.js';

const MIN_SCALE = 0.56;

/**
 * @param {HTMLElement} root
 * @param {{cycles: number, pattern: [number, number, number]}} cfg
 * @param {object} api step API
 * @returns {() => void} cleanup
 */
export function mountBreathing(root, cfg, api) {
  const [inhale, hold, exhale] = cfg.pattern;
  const phases = [['Вдих', inhale, 1], ['Затримка', hold, 1], ['Видих', exhale, MIN_SCALE]];
  let cycle = 0;
  let phase = 0;
  let phaseEnd = 0;
  let timer = 0;
  let ticker = 0;
  let started = false;
  let finished = false;

  const disc = h('div', { class: 'breath-disc' });
  const label = h('span', { class: 'breath-label' }, 'Готові?');
  const count = h('span', { class: 'breath-count' }, `${inhale}-${hold}-${exhale}`);
  const cycleEl = h('p', { class: 'breath-cycle' }, `${cfg.cycles} цикли по ${inhale + hold + exhale} секунд`);
  root.append(
    h('div', { class: 'breath' }, h('div', { class: 'breath-guide' }), disc, h('div', { class: 'breath-text', 'aria-live': 'polite' }, label, count)),
    cycleEl,
  );
  disc.style.transform = `scale(${MIN_SCALE})`;

  const describe = () => ({ summary: `Дихання ${inhale}-${hold}-${exhale}: ${Math.max(cycle, finished ? cfg.cycles : 0)} з ${cfg.cycles} циклів` });

  function runPhase() {
    const [name, sec, scale] = phases[phase];
    label.textContent = name;
    disc.style.transitionDuration = `${sec}s`;
    disc.style.transform = `scale(${scale})`;
    disc.dataset.phase = String(phase);
    phaseEnd = performance.now() + sec * 1000;
    cycleEl.textContent = `Цикл ${cycle + 1} з ${cfg.cycles}`;
    timer = setTimeout(nextPhase, sec * 1000);
  }

  function nextPhase() {
    phase += 1;
    if (phase === phases.length) {
      phase = 0;
      cycle += 1;
      if (cycle >= cfg.cycles) { finish(); return; }
    }
    runPhase();
  }

  function finish() {
    finished = true;
    clearInterval(ticker);
    label.textContent = 'Готово';
    count.textContent = '';
    cycleEl.textContent = `${cfg.cycles} з ${cfg.cycles} циклів`;
    disc.classList.add('is-done');
    vibrate(20);
    api.setPrimary({ label: 'Готово', onClick: () => api.complete(describe()) });
    api.setSecondary(null);
  }

  function start() {
    started = true;
    ticker = setInterval(() => {
      if (!finished) count.textContent = String(Math.max(1, Math.ceil((phaseEnd - performance.now()) / 1000)));
    }, 200);
    runPhase();
    count.textContent = String(inhale);
    api.setPrimary(null);
    api.setSecondary({ label: 'Завершити раніше', onClick: () => api.complete(describe()) });
  }

  api.setPrimary({ label: 'Почати', onClick: () => { if (!started) start(); } });
  api.setSecondary(null);
  return () => { clearTimeout(timer); clearInterval(ticker); };
}
