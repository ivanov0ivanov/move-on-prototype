/**
 * Inline SVG icon set (24×24, stroke = currentColor). Brand marks are filled.
 */

const STROKE = {
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  check: '<path d="M5 12.5l4.3 4.3L19 7.2"/>',
  english: '<path d="M5 4.8h14a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2h-6.6L8 20.6v-3.4H5a2 2 0 0 1-2-2V6.8a2 2 0 0 1 2-2z"/><path d="M7.6 14l2.5-6 2.5 6M8.5 12.1h3.2M15.2 10.4h2.6M15.2 13h2.6"/>',
  pilates: '<circle cx="5.6" cy="10.2" r="1.9"/><path d="M7.8 11.6l12.4 4.2M8.4 12.1v4.4h3.2M3 19.5h18"/>',
  reading: '<path d="M12 6.6C10 5.1 7.4 4.6 3.8 4.9v12.6c3.6-.3 6.2.2 8.2 1.7 2-1.5 4.6-2 8.2-1.7V4.9c-3.6-.3-6.2.2-8.2 1.7zM12 6.6v12.6"/>',
  recovery: '<path d="M3 9.2h10.4a3 3 0 1 0-3-3M3 14.8h14.2a3 3 0 1 1-3 3M3 12h6.5"/>',
  warmup: '<circle cx="12" cy="4.6" r="1.9"/><path d="M6.5 3.5l5.5 4.4 5.5-4.4M12 7.9v6M12 13.9l-3.8 6.4M12 13.9l3.8 6.4"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  today: '<path d="M12 21v-8.2M12 12.8c0-4.2 3-6.4 7.2-6.4 0 4.2-3 6.4-7.2 6.4zM12 15.3c0-3.3-2.5-5.2-6.2-5.2 0 3.3 2.5 5.2 6.2 5.2z"/>',
  progress: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>',
  safe: '<rect x="3.5" y="4" width="17" height="15" rx="3.2"/><circle cx="12" cy="11.5" r="3.6"/><path d="M12 7.9v1.2M12 13.9v1.2M15.6 11.5h-1.2M9.6 11.5H8.4M7 19v1.8M17 19v1.8"/>',
  flame: '<path d="M12 21c-3.9 0-6.6-2.7-6.6-6.2 0-3.6 2.7-5.6 4.1-8.6.6 1.9 1.6 3 2.7 3.7.3-2.4 1.4-4.6 3.1-6.2.4 2.5 3.3 5.3 3.3 9.1 0 4.7-2.7 8.2-6.6 8.2z"/>',
  steps: '<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12.3l2.6 2.6 5-5.2"/>',
  card: '<rect x="5.5" y="3.5" width="13" height="17" rx="2.8"/><path d="M12 15.2l-2.7-2.6a1.7 1.7 0 0 1 2.7-2 1.7 1.7 0 0 1 2.7 2z"/>',
  sync: '<path d="M19.5 12a7.5 7.5 0 0 1-13.1 5M4.5 12a7.5 7.5 0 0 1 13.1-5M17.8 3.5v3.7h-3.7M6.2 20.5v-3.7h3.7"/>',
  camera: '<path d="M4 8.6A2.6 2.6 0 0 1 6.6 6h1.8l1.4-2h4.4l1.4 2h1.8A2.6 2.6 0 0 1 20 8.6v7.8a2.6 2.6 0 0 1-2.6 2.6H6.6A2.6 2.6 0 0 1 4 16.4z"/><circle cx="12" cy="12.4" r="3.4"/>',
  mark: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M8.4 12.2l2.5 2.5 4.8-5"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.8"/><path d="M4.2 7.2L12 13l7.8-5.8"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.9h.01"/>',
  heart: '<path d="M12 20s-7.2-4.4-7.2-10A4.1 4.1 0 0 1 12 7.4 4.1 4.1 0 0 1 19.2 10c0 5.6-7.2 10-7.2 10z"/>',
  bank: '<path d="M3.5 9.5h17M5.5 9.5v8M9.8 9.5v8M14.2 9.5v8M18.5 9.5v8M3.5 20h17M12 3.5l8.5 4.6h-17z"/>',
  coins: '<ellipse cx="12" cy="7" rx="6.5" ry="2.6"/><path d="M5.5 7v5c0 1.4 2.9 2.6 6.5 2.6s6.5-1.2 6.5-2.6V7M5.5 12v5c0 1.4 2.9 2.6 6.5 2.6s6.5-1.2 6.5-2.6v-5"/>',
  undo: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4.2h4.2"/>',
  tap: '<path d="M9 11.5V6.2a1.6 1.6 0 0 1 3.2 0v4.6l4.2.9a1.8 1.8 0 0 1 1.4 2l-.6 4.3a2.6 2.6 0 0 1-2.6 2.2h-3.4a2.6 2.6 0 0 1-2.1-1l-3-4a1.4 1.4 0 0 1 2.1-1.8L9 15"/>',
  play: '<path d="M8 5.8v12.4l10-6.2z"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  book: '<path d="M5 4.5h10.5a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z"/><path d="M5 16.5a3 3 0 0 1 3-3h10.5"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6"/>',
};

const FILLED = {
  apple: '<path fill="currentColor" d="M16.4 12.7c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8C6.9 7.4 5 8.9 5 12c0 1.9.7 3.9 1.6 5.2.8 1.1 1.5 2.1 2.6 2 1-.1 1.4-.7 2.7-.7s1.6.7 2.7.7c1.1 0 1.8-1 2.5-2 .8-1.2 1.1-2.3 1.1-2.3s-1.8-.8-1.8-2.2zM14.4 5.6c.6-.7 1-1.7.9-2.6-.8 0-1.8.5-2.4 1.2-.5.6-1 1.6-.9 2.5.9.1 1.8-.4 2.4-1.1z"/>',
  google: '<path fill="#4285F4" d="M20.6 12.2c0-.6-.1-1.2-.2-1.8H12v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/><path fill="#34A853" d="M12 21c2.4 0 4.5-.8 5.9-2.2L15 16.5c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.3A9 9 0 0 0 12 21z"/><path fill="#FBBC05" d="M7 13.7a5.4 5.4 0 0 1 0-3.4V8H4a9 9 0 0 0 0 8z"/><path fill="#EA4335" d="M12 6.6c1.3 0 2.5.5 3.4 1.3L18 5.3A9 9 0 0 0 4 8l3 2.3c.7-2.1 2.7-3.7 5-3.7z"/>',
};

/**
 * Returns an inline SVG icon element.
 * @param {string} name
 * @param {number} [size=24]
 */
export function icon(name, size = 24) {
  const tpl = document.createElement('template');
  const filled = FILLED[name];
  const body = filled || STROKE[name] || STROKE.info;
  const attrs = filled
    ? ''
    : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  tpl.innerHTML = `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ${attrs}>${body}</svg>`;
  return tpl.content.firstElementChild;
}
