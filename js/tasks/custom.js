/**
 * Custom goal: name the goal, then a one-minute timer for the first step.
 */
import { h } from '../ui.js';
import { mountCountdown } from './countdown.js';

const SUGGESTIONS = ['Гітара', 'Іспанська', 'Біг', 'Малювання', 'Медитація'];

/**
 * @param {HTMLElement} root
 * @param {{seconds: number}} cfg
 * @param {object} api step API (+ setTitle, setHint, onCustomTitle)
 * @returns {() => void} cleanup
 */
export function mountCustom(root, cfg, api) {
  let cleanupTimer = () => {};
  const input = h('input', {
    class: 'input', id: 'custom-goal', type: 'text', maxlength: '40', autocomplete: 'off',
    autocapitalize: 'sentences', enterkeyhint: 'go', placeholder: 'Наприклад, гітара',
  });
  const chips = h('div', { class: 'chips' }, SUGGESTIONS.map((s) => h('button', {
    type: 'button', class: 'chip', onClick: () => { input.value = s; sync(); },
  }, s)));
  const form = h('div', { class: 'custom-form' },
    h('label', { class: 'field-label', for: 'custom-goal' }, 'Як назвеш ціль?'),
    input, chips,
    h('p', { class: 'custom-note' }, 'Далі 40 секунд на перший крок. Можна недосконало.'));
  root.append(form);

  function begin() {
    const title = input.value.trim();
    if (!title) return;
    input.blur();
    api.onCustomTitle(title);
    api.setTitle(title);
    api.setHint('40 секунд на перший крок. Почни з найпростішого.');
    form.remove();
    cleanupTimer = mountCountdown(root, { seconds: cfg.seconds, title }, api, {
      autoStart: true,
      summary: (sec) => `${title}: ${sec} секунд на перший крок`,
    });
  }

  function sync() {
    api.setPrimary({ label: 'Почати', disabled: !input.value.trim(), onClick: begin });
  }

  input.addEventListener('input', sync);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') begin(); });
  api.setSecondary(null);
  sync();
  return () => cleanupTimer();
}
