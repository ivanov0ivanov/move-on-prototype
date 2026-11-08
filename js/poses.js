/**
 * Simple line illustrations of exercise poses (viewBox 200×120).
 */

const MAT = '<rect x="14" y="99" width="172" height="8" rx="4" fill="#ECE6D4"/>';
const FLOOR = '<ellipse cx="100" cy="108" rx="44" ry="5" fill="#ECE6D4"/>';
const ARROW = 'fill="none" stroke="#3FA66B" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="1 7"';

const limbs = (d) => `<path d="${d}" fill="none" stroke="#1C1B2E" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
const torso = (d) => `<path d="${d}" fill="none" stroke="#2F5BEA" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`;
const head = (x, y) => `<circle cx="${x}" cy="${y}" r="9.5" fill="#1C1B2E"/>`;

const BODY = {
  plank: MAT + limbs('M112 80 L166 92 L171 98 M54 70 L56 97 L80 97') + torso('M54 70 L112 80') + head(40, 63),
  bridge: MAT + limbs('M100 68 L132 61 L140 97 M50 97 L88 98') + torso('M48 94 L100 68') + head(33, 91),
  cat: MAT + limbs('M56 64 L54 98 M128 62 L130 97 L166 97') + torso('M56 64 Q92 38 128 62') + head(42, 75),
  shoulders: FLOOR + limbs('M100 70 L90 104 M100 70 L110 104 M96 39 L78 47 L90 36 M104 39 L122 47 L110 36')
    + torso('M100 37 L100 70') + head(100, 22)
    + `<path d="M66 56 a11 11 0 1 1 10 9" ${ARROW}/><path d="M134 56 a11 11 0 1 0 -10 9" ${ARROW}/>`,
  neck: FLOOR + limbs('M100 70 L90 104 M100 70 L110 104 M100 40 L87 68 M100 40 L113 68')
    + torso('M100 37 L100 70') + head(93, 23) + `<path d="M76 14 Q100 -4 124 14" ${ARROW}/>`,
  reach: FLOOR + limbs('M100 70 L90 104 M100 70 L110 104 M98 40 L86 6 M102 40 L114 6')
    + torso('M100 37 L100 70') + head(100, 24) + `<path d="M70 40 V16 M130 40 V16" ${ARROW}/>`,
  twist: FLOOR + limbs('M100 70 L90 104 M100 70 L110 104 M100 41 L72 44 M100 41 L128 38')
    + torso('M100 37 L100 70') + head(100, 22) + `<ellipse cx="100" cy="58" rx="34" ry="8" ${ARROW}/>`,
  march: FLOOR + limbs('M100 70 L96 104 M100 70 L120 79 L117 99 M100 41 L86 63 M100 41 L115 56')
    + torso('M100 37 L100 70') + head(100, 22),
};

/**
 * @param {string} name pose id
 * @returns {string} SVG markup
 */
export function poseSvg(name) {
  const body = BODY[name] || BODY.plank;
  return `<svg viewBox="0 0 200 120" class="pose-svg" role="img" aria-hidden="true">${body}</svg>`;
}
