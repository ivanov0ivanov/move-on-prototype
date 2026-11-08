/**
 * Sequenced moves timer (warm-up, pilates daily): one pose at a time, auto-advance.
 */
import { h, vibrate } from '../ui.js';
import { poseSvg } from '../poses.js';

/**
 * @param {HTMLElement} root
 * @param {{moves: Array<{name: string, seconds: number, pose: string}>}} cfg
 * @param {object} api step API
 * @returns {() => void} cleanup
 */
export function mountSequence(root, cfg, api) {
  const { moves } = cfg;
  const total = moves.reduce((s, m) => s + m.seconds, 0);
  let idx = 0;
  let remaining = moves[0].seconds * 1000;
  let running = false;
  let finished = false;
  let last = 0;
  let raf = 0;

  const pose = h('div', { class: 'pose-card pose-card--seq', html: poseSvg(moves[0].pose) });
  const moveName = h('p', { class: 'seq-name' }, moves[0].name);
  const secs = h('span', { class: 'seq-secs' }, String(moves[0].seconds));
  const rows = moves.map((m, i) => h('li', { class: 'seq-row' },
    h('span', { class: 'seq-idx' }, String(i + 1)),
    h('span', { class: 'seq-row-name' }, m.name),
    h('span', { class: 'seq-row-sec' }, `${m.seconds} с`),
    h('span', { class: 'seq-fill', 'aria-hidden': 'true' })));
  root.append(
    pose,
    h('div', { class: 'seq-now' }, moveName, h('p', { class: 'seq-count' }, secs, h('span', {}, ' с'))),
    h('ol', { class: 'seq-list' }, rows),
  );

  const doneSeconds = () => moves.slice(0, idx).reduce((s, m) => s + m.seconds, 0) + (moves[idx] ? moves[idx].seconds - remaining / 1000 : 0);
  const describe = () => ({
    summary: finished ? `${moves.length} ${moves.length < 5 ? 'рухи' : 'рухів'}, ${total} секунд` : `${idx} з ${moves.length} рухів`,
    chips: moves.slice(0, finished ? moves.length : idx).map((m) => m.name),
    seconds: Math.round(doneSeconds()),
  });

  function render() {
    secs.textContent = String(Math.ceil(remaining / 1000));
    rows.forEach((r, i) => {
      r.classList.toggle('is-current', i === idx && !finished);
      r.classList.toggle('is-done', i < idx || finished);
      const p = i < idx || finished ? 1 : i === idx ? 1 - remaining / (moves[i].seconds * 1000) : 0;
      r.querySelector('.seq-fill').style.transform = `scaleX(${p})`;
    });
  }

  function setMove(i) {
    idx = i;
    remaining = moves[i].seconds * 1000;
    pose.classList.remove('swap');
    void pose.offsetWidth;
    pose.classList.add('swap');
    pose.innerHTML = poseSvg(moves[i].pose);
    moveName.textContent = moves[i].name;
    vibrate(10);
  }

  function tick(t) {
    if (!running) return;
    remaining -= t - last;
    last = t;
    if (remaining <= 0) {
      if (idx < moves.length - 1) {
        setMove(idx + 1);
      } else {
        remaining = 0;
        running = false;
        finished = true;
        moveName.textContent = 'Усі рухи зроблено';
        vibrate(20);
        sync();
      }
    }
    render();
    if (running) raf = requestAnimationFrame(tick);
  }

  function start() {
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
    sync();
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
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
    } else if (idx > 0 || remaining < moves[0].seconds * 1000) {
      api.setPrimary({ label: 'Продовжити', onClick: start });
      api.setSecondary(finishEarly);
    } else {
      api.setPrimary({ label: 'Почати', onClick: start });
      api.setSecondary(null);
    }
  }

  render();
  sync();
  return () => cancelAnimationFrame(raf);
}
