/**
 * MOVE ON prototype bootstrap: routes, tab bar, moderator gestures, service worker.
 */
import { h, icon } from './ui.js';
import { route, setFallback, onRouteChange, startRouter } from './router.js';
import { getState } from './state.js';
import { initTapCounter, startTapCount } from './metrics.js';
import { openModerator } from './moderator.js';
import { StartScreen } from './screens/start.js';
import { StepScreen } from './screens/step.js';
import { SuccessScreen } from './screens/success.js';
import { HomeScreen } from './screens/home.js';
import { ProgressScreen } from './screens/progress.js';
import { SafeScreen } from './screens/safe.js';
import { DepositScreen } from './screens/deposit.js';

const needsStart = () => (getState().startDay ? null : '/start');

route('/start', StartScreen);
route('/step/:goal', StepScreen);
route('/success', SuccessScreen, { guard: () => (getState().firstStep ? null : '/start') });
route('/home', HomeScreen, { tab: 'home', guard: needsStart });
route('/progress', ProgressScreen, { tab: 'progress', guard: needsStart });
route('/safe', SafeScreen, { tab: 'safe', guard: needsStart });
route('/deposit', DepositScreen, { guard: needsStart });
setFallback(() => (getState().startDay ? '/home' : '/start'));

/* ---------- tab bar ---------- */

const TABS = [['home', 'Сьогодні', 'today'], ['progress', 'Прогрес', 'progress'], ['safe', 'Сейф', 'safe']];
const tabbar = document.getElementById('tabbar');
tabbar.setAttribute('aria-label', 'Розділи');
tabbar.append(...TABS.map(([id, label, ico]) => h('a', { class: 'tab', href: `#/${id}`, dataset: { tab: id } },
  h('span', { class: 'tab-ico' }, icon(ico, 22)), h('span', { class: 'tab-label' }, label))));

onRouteChange((opts) => {
  tabbar.hidden = !opts.tab;
  tabbar.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.tab === opts.tab;
    t.classList.toggle('active', on);
    if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
});

/* ---------- moderator gestures ---------- */

const LONG_PRESS_MS = 900;
let pressTimer = 0;
let pressedLogo = null;
let pressStart = null;

document.addEventListener('pointerdown', (e) => {
  const logo = e.target.closest('.logo');
  if (!logo) return;
  pressedLogo = logo;
  pressStart = [e.clientX, e.clientY];
  logo.classList.add('is-pressing');
  pressTimer = setTimeout(() => {
    logo.classList.remove('is-pressing');
    pressedLogo = null;
    try { navigator.vibrate?.(25); } catch { /* unsupported */ }
    openModerator();
  }, LONG_PRESS_MS);
});
const cancelPress = () => {
  clearTimeout(pressTimer);
  pressedLogo?.classList.remove('is-pressing');
  pressedLogo = null;
};
['pointerup', 'pointercancel'].forEach((ev) => document.addEventListener(ev, cancelPress, true));
document.addEventListener('pointermove', (e) => {
  if (pressedLogo && Math.hypot(e.clientX - pressStart[0], e.clientY - pressStart[1]) > 12) cancelPress();
});
document.addEventListener('contextmenu', (e) => { if (e.target.closest('.logo')) e.preventDefault(); });

let taps = [];
document.addEventListener('click', (e) => {
  if (!e.target.closest('.version')) return;
  const now = performance.now();
  taps = [...taps.filter((t) => now - t < 700), now];
  if (taps.length >= 3) {
    taps = [];
    openModerator();
  }
});

/* ---------- start ---------- */

initTapCounter();
if (!getState().firstStep) startTapCount();
startRouter();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW registration failed', err));
  });
}
