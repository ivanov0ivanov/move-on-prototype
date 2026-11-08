/**
 * Minimal hash router. A screen factory returns `{ el, mounted?, cleanup? }`.
 * Routes look like `/step/:goal`; query strings are parsed into `ctx.query`.
 */

const routes = [];
const changeListeners = new Set();
let current = null;
let currentOpts = null;
let fallback = () => '/';

/**
 * @param {string} pattern e.g. '/step/:goal'
 * @param {(ctx: {params: object, query: object, path: string}) => {el: HTMLElement, mounted?: Function, cleanup?: Function}} factory
 * @param {{tab?: string, guard?: () => string|null}} [opts]
 */
export function route(pattern, factory, opts = {}) {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  routes.push({ re, keys, factory, opts });
}

export function setFallback(fn) { fallback = fn; }

export function onRouteChange(fn) { changeListeners.add(fn); }

export function navigate(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (location.hash === target) { resolve(); return; }
  if (replace) {
    history.replaceState(null, '', target);
    resolve();
  } else {
    location.hash = target;
  }
}

/** Re-renders the current route (e.g. after a state change that the screen does not observe). */
export const rerender = () => resolve();

function parse() {
  const raw = location.hash.slice(1) || '/';
  const [path, qs = ''] = raw.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs)) };
}

function resolve() {
  const { path, query } = parse();
  for (const r of routes) {
    const m = path.match(r.re);
    if (!m) continue;
    const redirect = r.opts.guard?.();
    if (redirect) { navigate(redirect, { replace: true }); return; }
    const params = {};
    r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
    mount(r, { params, query, path });
    return;
  }
  navigate(fallback(), { replace: true });
}

function mount(r, ctx) {
  current?.cleanup?.();
  const view = document.getElementById('view');
  const screen = r.factory(ctx);
  const sameRoute = currentOpts === r.opts;
  const tabSwitch = Boolean(r.opts.tab && currentOpts?.tab);
  if (!sameRoute) screen.el.classList.add(tabSwitch ? 'screen-fade' : 'screen-enter');
  view.replaceChildren(screen.el);
  current = screen;
  currentOpts = r.opts;
  changeListeners.forEach((fn) => fn(r.opts, ctx));
  screen.mounted?.();
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  resolve();
}
