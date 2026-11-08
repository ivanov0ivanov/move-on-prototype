/**
 * Shared UI helpers: element factory, bottom sheets, toasts, timer ring, formatting.
 */
import { icon } from './icons.js';
import { parseKey } from './state.js';

export { icon };

/**
 * Creates an element. Props: class, style (object), on* handlers, html, dataset, any attribute.
 * @returns {HTMLElement}
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    }
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/* ---------- formatting ---------- */

/** 42 -> "0:42", 75 -> "1:15". */
export function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Ukrainian plural: plural(3, ['день', 'дні', 'днів']) -> 'дні'. */
export function plural(n, [one, few, many]) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtDay = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' });
const fmtWeekday = new Intl.DateTimeFormat('uk-UA', { weekday: 'long' });
const fmtWeekdayShort = new Intl.DateTimeFormat('uk-UA', { weekday: 'short' });
const fmtMonth = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' });

/** "Неділя, 8 листопада" */
export const longDate = (d) => cap(`${fmtWeekday.format(d)}, ${fmtDay.format(d)}`);
/** "8 листопада" from a day key */
export const dayMonth = (k) => fmtDay.format(parseKey(k));
/** "нд, 15 листопада" from a day key */
export const shortDate = (k) => `${fmtWeekdayShort.format(parseKey(k))}, ${fmtDay.format(parseKey(k))}`;
/** "Листопад 2026" (nominative month) */
export const monthTitle = (d) => cap(fmtMonth.format(d).replace(/\s*р\.$/, ''));

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

/** Screen-reader labels for day statuses from state.dayStatus(). */
export const DAY_LABEL = { done: 'крок зроблено', forgiven: 'картка прощення', skipped: 'пропуск', today: 'сьогодні', future: 'попереду', before: 'до старту' };

export function greeting(d = new Date()) {
  const hr = d.getHours();
  if (hr >= 5 && hr < 12) return 'Доброго ранку';
  if (hr >= 12 && hr < 17) return 'Добрий день';
  if (hr >= 17 && hr < 23) return 'Добрий вечір';
  return 'Доброї ночі';
}

/* ---------- small components ---------- */

const LOGO_MARK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#7BC67E" d="M12 13.2C12 8.6 15.4 6 20 6c0 4.6-3.4 7.2-8 7.2z"/><path fill="#F2C230" d="M12 15.4c0-3.8-2.9-6-6.8-6 0 3.8 2.9 6 6.8 6z"/><path fill="none" stroke="#FFF8E5" stroke-width="2.2" stroke-linecap="round" d="M12 21v-8"/></svg>';

/** Brand logo. Long-pressing it opens the moderator panel (wired in app.js). */
export function Logo() {
  return h('div', { class: 'logo', 'aria-label': 'MOVE ON' }, h('span', { class: 'logo-mark', html: LOGO_MARK }), h('span', { class: 'logo-word' }, 'MOVE ON'));
}

/** Tiny version label. Triple tap opens the moderator panel (wired in app.js). */
export const Version = () => h('span', { class: 'version' }, 'v2.1');

export const ProtoNote = (text = 'Прототип: гроші не списуються') => h('p', { class: 'proto-note' }, icon('info', 15), text);

/**
 * Circular progress ring.
 * @param {number} size px
 * @param {number} stroke px
 */
export function createRing(size = 220, stroke = 14) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tpl = document.createElement('template');
  tpl.innerHTML = `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none"/>
    <circle class="ring-bar" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
  const svg = tpl.content.firstElementChild;
  const bar = svg.querySelector('.ring-bar');
  return {
    el: svg,
    /** @param {number} p 0..1 */
    set(p) { bar.style.strokeDashoffset = String(c * (1 - Math.max(0, Math.min(1, p)))); },
  };
}

export function vibrate(ms = 12) {
  try { navigator.vibrate?.(ms); } catch { /* unsupported */ }
}

/* ---------- toast ---------- */

export function toast(text, { iconName = 'check', duration = 2800 } = {}) {
  const root = document.getElementById('toast-root');
  const t = h('div', { class: 'toast', role: 'status' }, icon(iconName, 18), h('span', {}, text));
  root.append(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, duration);
}

/* ---------- bottom sheet ---------- */

/**
 * Opens a bottom sheet inside the app frame. Drag the handle down or tap the backdrop to close.
 * @param {{content: Node|Node[], className?: string, label?: string, dismissible?: boolean, onClose?: (reason: string) => void}} opts
 * @returns {{el: HTMLElement, close: (reason?: string) => void}}
 */
export function openSheet({ content, className = '', label = '', dismissible = true, onClose }) {
  const root = document.getElementById('sheet-root');
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const handle = h('div', { class: 'sheet-grab', 'aria-hidden': 'true' }, h('span', { class: 'sheet-handle' }));
  const sheet = h('div', { class: `sheet ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, handle, content);
  const layer = h('div', { class: 'sheet-layer' }, backdrop, sheet);
  root.append(layer);
  requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('open')));

  let closed = false;
  const close = (reason = 'close') => {
    if (closed) return;
    closed = true;
    sheet.style.transform = '';
    layer.classList.remove('open');
    setTimeout(() => layer.remove(), 450);
    onClose?.(reason);
  };

  if (dismissible) {
    backdrop.addEventListener('click', () => close('backdrop'));
    let startY = 0;
    let dy = 0;
    let t0 = 0;
    handle.addEventListener('pointerdown', (e) => {
      startY = e.clientY;
      dy = 0;
      t0 = performance.now();
      handle.setPointerCapture(e.pointerId);
      sheet.classList.add('dragging');
    });
    handle.addEventListener('pointermove', (e) => {
      if (!sheet.classList.contains('dragging')) return;
      dy = Math.max(0, e.clientY - startY);
      sheet.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (!sheet.classList.contains('dragging')) return;
      sheet.classList.remove('dragging');
      const velocity = dy / Math.max(1, performance.now() - t0);
      if (dy > 110 || velocity > 0.6) close('drag');
      else sheet.style.transform = '';
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }
  return { el: sheet, close };
}
