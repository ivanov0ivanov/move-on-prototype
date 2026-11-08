/**
 * Flashcards: EN word -> tap to flip -> UA translation + example. One card at a time with progress dots.
 */
import { h, icon } from '../ui.js';

/**
 * @param {HTMLElement} root
 * @param {{words: Array<{en:string, ipa:string, ua:string, ex:string, exUa:string}>}} cfg
 * @param {object} api step API (setPrimary, setSecondary, complete)
 * @returns {() => void} cleanup
 */
export function mountFlashcards(root, cfg, api) {
  const { words } = cfg;
  let idx = 0;
  let flipped = false;
  let card = null;
  let autoTimer = 0;
  const AUTO_MS = 1500;

  const deck = h('div', { class: 'deck' });
  const dots = h('div', { class: 'dots', 'aria-hidden': 'true' }, words.map(() => h('span', { class: 'dot' })));
  const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  root.append(deck, dots, live);

  const build = (w) => h('button', { class: 'flashcard', type: 'button', 'aria-label': `${w.en}. Торкнись, щоб перевернути`, onClick: advance },
    h('span', { class: 'fc-inner' },
      h('span', { class: 'fc-face fc-front' },
        h('span', { class: 'fc-word', lang: 'en' }, w.en),
        h('span', { class: 'fc-ipa' }, w.ipa),
        h('span', { class: 'fc-hint' }, icon('tap', 16), 'Торкнись, щоб перевернути')),
      h('span', { class: 'fc-face fc-back' },
        h('span', { class: 'fc-small', lang: 'en' }, w.en),
        h('span', { class: 'fc-tr' }, w.ua),
        h('span', { class: 'fc-ex', lang: 'en' }, w.ex),
        h('span', { class: 'fc-ex-tr' }, w.exUa))));

  function show() {
    const next = build(words[idx]);
    if (card) {
      const old = card;
      old.classList.add('leave');
      old.disabled = true;
      setTimeout(() => old.remove(), 360);
      next.classList.add('enter');
    }
    deck.append(next);
    card = next;
    flipped = false;
    sync();
  }

  function advance() {
    clearTimeout(autoTimer);
    if (!flipped) {
      flipped = true;
      card.classList.add('flipped');
      live.textContent = `${words[idx].en}: ${words[idx].ua}`;
      sync();
      // v1.1: next card comes by itself, so each word costs one tap instead of two
      if (idx < words.length - 1) autoTimer = setTimeout(advance, AUTO_MS);
      return;
    }
    if (idx < words.length - 1) {
      idx += 1;
      show();
      return;
    }
    api.complete({ summary: `${words.length} нових слів`, chips: words.map((w) => `${w.en} · ${w.ua}`) });
  }

  function sync() {
    [...dots.children].forEach((d, i) => {
      d.className = `dot${i < idx || (i === idx && flipped) ? ' done' : ''}${i === idx ? ' current' : ''}`;
    });
    const last = idx === words.length - 1;
    api.setPrimary({ label: !flipped ? 'Показати переклад' : last ? 'Готово' : 'Далі', onClick: advance });
    api.setSecondary(null);
  }

  show();
  return () => clearTimeout(autoTimer);
}
