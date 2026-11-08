/**
 * Counts taps from the first app open until the first step is finished.
 * Taps inside the moderator panel are ignored.
 */

const m = { active: false, taps: 0, openedAt: 0 };

export function initTapCounter() {
  document.addEventListener('pointerdown', (e) => {
    if (!m.active || e.target.closest?.('.sheet--service')) return;
    m.taps += 1;
  }, { capture: true, passive: true });
}

export function startTapCount() {
  m.active = true;
  m.taps = 0;
  m.openedAt = performance.now();
}

/** @returns {{taps: number, sinceOpen: number}} sinceOpen in seconds */
export function stopTapCount() {
  const result = { taps: m.taps, sinceOpen: Math.round((performance.now() - m.openedAt) / 1000) };
  m.active = false;
  return result;
}
