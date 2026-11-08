/**
 * Reading step: a built-in page or "my own book"; the step header shows the timer.
 */
import { h, icon } from '../ui.js';
import { READING_PAGE } from '../goals.js';

/**
 * @param {HTMLElement} root
 * @param {{seconds: number}} cfg
 * @param {object} api step API
 * @returns {() => void} cleanup
 */
export function mountReading(root, cfg, api) {
  const pages = cfg.seconds > 60 ? 'дві сторінки' : 'одну сторінку';
  const page = h('article', { class: 'page', lang: 'uk' }, READING_PAGE.map((p) => h('p', {}, p)));
  const own = h('div', { class: 'page page--own' },
    h('span', { class: 'own-ico' }, icon('book', 28)),
    h('p', { class: 'own-title' }, 'Відкрий свою книжку на закладці'),
    h('p', { class: 'own-text' }, `Прочитай ${pages}. Таймер угорі йде сам, поспішати не треба.`));
  own.hidden = true;

  let mode = 'here';
  const seg = h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Що читати' });
  const opts = [['here', 'Сторінка тут'], ['own', 'Моя книжка']].map(([key, text]) => h('button', {
    type: 'button', role: 'tab', class: key === 'here' ? 'on' : '', 'aria-selected': String(key === 'here'),
    onClick: (e) => {
      mode = key;
      page.hidden = key !== 'here';
      own.hidden = key === 'here';
      opts.forEach((b) => {
        const on = b === e.currentTarget;
        b.classList.toggle('on', on);
        b.setAttribute('aria-selected', String(on));
      });
    },
  }, text));
  seg.append(...opts);
  root.append(seg, page, own);

  const done = () => api.complete({ summary: mode === 'here' ? 'Одна сторінка в застосунку' : `Прочитано ${pages} у своїй книжці` });
  // v1.1: unlock after a short minimum so the step means actual reading
  const MIN_S = 15;
  api.setPrimary({ label: 'Читаю…', disabled: true, variant: 'secondary', onClick: () => {} });
  const unlock = setTimeout(() => api.setPrimary({ label: 'Прочитав(-ла)', onClick: done }), MIN_S * 1000);
  api.setSecondary(null);
  return () => clearTimeout(unlock);
}
