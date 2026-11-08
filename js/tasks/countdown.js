/**
 * Countdown with a big ring: plank, custom-goal minute and the daily timer.
 */
import { h, createRing, fmtTime, vibrate } from '../ui.js';
import { poseSvg } from '../poses.js';

/**
 * @param {HTMLElement} root
 * @param {{seconds: number, pose?: string, title?: string}} cfg
 * @param {object} api step API
 * @param {{autoStart?: boolean, summary?: (doneSec: number) => string}} [opts]
 * @returns {() => void} cleanup
 */
export function mountCountdown(root, cfg, api, { autoStart = false, summary } = {}) {
  const total = cfg.seconds * 1000;
  let remaining = total;
  let running = false;
  let finished = false;
  let last = 0;
  let raf = 0;

  const ring = createRing(cfg.pose ? 188 : 232, 14);
  const num = h('span', { class: 'ring-num' });
  const cap = h('span', { class: 'ring-cap' }, 'секунд');
  const wrap = h('div', { class: 'ring-wrap' }, ring.el, h('div', { class: 'ring-center' }, num, cap));
  if (cfg.pose) root.append(h('div', { class: 'pose-card', html: poseSvg(cfg.pose) }));
  root.append(wrap);

  const describe = () => {
    const done = Math.round((total - remaining) / 1000);
    if (summary) return { summary: summary(done) };
    return { summary: finished ? cfg.title : `${cfg.title}: ${fmtTime(done)} з ${fmtTime(cfg.seconds)}` };
  };

  function render() {
    const sec = Math.ceil(remaining / 1000);
    num.textContent = cfg.seconds >= 60 ? fmtTime(sec) : String(sec);
    cap.textContent = finished ? 'готово' : cfg.seconds >= 60 ? 'залишилось' : 'секунд';
    ring.set(1 - remaining / total);
  }

  function tick(t) {
    if (!running) return;
    remaining -= t - last;
    last = t;
    if (remaining <= 0) {
      remaining = 0;
      running = false;
      finished = true;
      wrap.classList.add('is-done');
      vibrate(20);
      sync();
    }
    render();
    if (running) raf = requestAnimationFrame(tick);
  }

  function start() {
    running = true;
    last = performance.now();
    wrap.classList.add('is-running');
    raf = requestAnimationFrame(tick);
    sync();
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
    wrap.classList.remove('is-running');
    sync();
  }

  const finishEarly = { label: 'Завершити раніше', onClick: () => api.complete(describe()) };

  function sync() {
    if (finished) {
      api.setPrimary({ label: 'Готово', onClick: () => api.complete(describe()) });
      api.setSecondary(null);
    } else if (running) {
      api.setPrimary({ label: 'Пауза', variant: 'secondary', onClick: pause });
      api.setSecondary(finishEarly);
    } else if (remaining < total) {
      api.setPrimary({ label: 'Продовжити', onClick: start });
      api.setSecondary(finishEarly);
    } else {
      api.setPrimary({ label: 'Почати', onClick: start });
      api.setSecondary(null);
    }
  }

  render();
  if (autoStart) start(); else sync();
  return () => cancelAnimationFrame(raf);
}
