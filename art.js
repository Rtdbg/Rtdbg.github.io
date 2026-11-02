/* Atelier graphique des Voix du Faso : silhouettes et paysages au coucher du soleil, dessinés par le code.
   Partagé par les scènes animées (illustrations.js) et le générateur de couvertures (scripts/generer_couvertures.mjs). */
export const PALETTES = {
  braise: ['#16112f', '#5a1f3f', '#c4472c', '#f39a3c', '#ffd27a'],
  or: ['#23173f', '#7a2f43', '#d9672f', '#f6b04a', '#ffe3a1'],
  nuit: ['#050b22', '#0f1f52', '#22397a', '#3f5aa8', '#8fa6e0'],
  aube: ['#1b1f4d', '#533a78', '#b65a7b', '#f0996f', '#ffd9a0'],
  sahel: ['#2b1636', '#8a3b2f', '#d67a2e', '#efbd63', '#fbe7b0'],
  fleuve: ['#07213a', '#0f4a63', '#2a8083', '#e0a94a', '#ffe0a0']
};
export const ENCRE = '#120a1f';

/* Générateur pseudo-aléatoire : une même graine donne toujours le même dessin. */
export function graine(n) { let s = n >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const f = (n) => Math.round(n * 10) / 10;
const place = (x, y, s, contenu, cls = '', miroir = false) => `<g transform="translate(${f(x)} ${f(y)}) scale(${miroir ? -s : s} ${s})"><g class="${cls}">${contenu}</g></g>`;

export function degrade(id, p) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset=".42" stop-color="${p[1]}"/><stop offset=".72" stop-color="${p[2]}"/><stop offset="1" stop-color="${p[3]}"/></linearGradient>
    <radialGradient id="${id}-s"><stop offset="0" stop-color="${p[4]}"/><stop offset=".45" stop-color="${p[4]}" stop-opacity=".95"/><stop offset=".5" stop-color="${p[3]}" stop-opacity=".5"/><stop offset="1" stop-color="${p[3]}" stop-opacity="0"/></radialGradient>`;
}

/* Une ligne de collines : polygone fermé sur le bas de l'image. */
export function collines(l, h, base, amplitude, couleur, n = 3) {
  const r = graine(n * 97 + 13);
  const a = [r() * 6, r() * 6, r() * 6], k = [1.3 + r(), 2.7 + r() * 2, 5 + r() * 3];
  let d = `M0 ${h}`;
  for (let x = 0; x <= l; x += l / 40) {
    const t = (x / l) * Math.PI * 2;
    const y = base - amplitude * (0.55 * Math.sin(k[0] * t + a[0]) + 0.3 * Math.sin(k[1] * t + a[1]) + 0.15 * Math.sin(k[2] * t + a[2]));
    d += ` L${f(x)} ${f(y)}`;
  }
  return `<path d="${d} L${l} ${h}Z" fill="${couleur}"/>`;
}

/* Arbres dessinés par branches successives. */
function branches(x, y, angle, long, ep, n, r, sortie) {
  const x2 = x + Math.cos(angle) * long, y2 = y + Math.sin(angle) * long;
  sortie.push(`<path d="M${f(x)} ${f(y)} L${f(x2)} ${f(y2)}" stroke-width="${f(ep)}"/>`);
  if (n <= 0) return;
  const c = 2 + (r() > 0.6 ? 1 : 0);
  for (let i = 0; i < c; i++) branches(x2, y2, angle + (r() - 0.5) * 1.5, long * (0.62 + r() * 0.16), ep * 0.62, n - 1, r, sortie);
}
export function baobab(x, y, s = 1, g = 3, couleur = ENCRE, cls = '') {
  const r = graine(g * 131 + 7), t = [];
  for (let i = 0; i < 7; i++) branches((i - 3) * 5, -78, -Math.PI / 2 + (i - 3) * 0.27 + (r() - 0.5) * 0.1, 28 + r() * 10, 8, 3, r, t);
  return place(x, y, s, `<path d="M-30 0 Q-22 -6 -21 -30 Q-22 -60 -20 -84 L20 -84 Q22 -60 21 -30 Q22 -6 32 0Z" fill="${couleur}"/><g stroke="${couleur}" stroke-linecap="round" fill="none">${t.join('')}</g>`, cls);
}
export function acacia(x, y, s = 1, g = 5, couleur = ENCRE, cls = '') {
  const r = graine(g * 71 + 3);
  let houppe = '';
  for (let i = 0; i < 9; i++) { const a = -70 + i * 17.5 + r() * 6, b = -96 - Math.cos((i - 4) / 4 * 1.5) * 18 + r() * 5; houppe += `<ellipse cx="${f(a)}" cy="${f(b)}" rx="${f(17 + r() * 8)}" ry="${f(7 + r() * 3)}"/>`; }
  return place(x, y, s, `<path d="M-4 0 Q-2 -40 -3 -60 Q-22 -78 -48 -90 M3 0 Q3 -40 3 -58 Q20 -76 50 -90 M0 -56 Q0 -80 0 -100" stroke="${couleur}" stroke-width="6" fill="none" stroke-linecap="round"/><g fill="${couleur}">${houppe}</g>`, cls);
}
/* Herbes hautes au premier plan. */
export function herbes(l, y, c = ENCRE, g = 9, n = 70) {
  const r = graine(g * 53 + 11); let d = '';
  for (let i = 0; i < n; i++) { const x = r() * l, h = 7 + r() * 20, p = (r() - 0.5) * 12; d += `M${f(x)} ${y + 6} Q${f(x + p * 0.3)} ${f(y - h * 0.6)} ${f(x + p)} ${f(y - h)} `; }
  return `<path d="${d}" stroke="${c}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
}
/* Étoiles. */
export function etoiles(l, h, n = 40, g = 2, cls = 'anim-scintille') {
  const r = graine(g * 41 + 5); let s = '';
  for (let i = 0; i < n; i++) s += `<circle class="${cls}" style="animation-delay:${f(r() * 3)}s" cx="${f(r() * l)}" cy="${f(r() * h)}" r="${f(0.5 + r() * 1.2)}" fill="#fff" opacity="${f(0.45 + r() * 0.5)}"/>`;
  return s;
}

/* Silhouettes : les pieds sur la ligne y = 0, regard vers la droite. */
const trace = (d, c = ENCRE) => `<path d="${d}" fill="${c}"/>`;
const ANIMAUX = {
  hyene: (c) => trace('M-74 0 L-70 -24 Q-82 -30 -84 -46 Q-74 -36 -66 -38 Q-56 -50 -30 -54 Q0 -60 22 -76 Q38 -84 50 -78 L52 -92 L60 -80 L68 -92 L70 -76 Q84 -68 96 -60 L97 -52 L72 -48 Q58 -38 50 -28 L54 0 L44 0 L36 -22 Q0 -28 -32 -26 L-40 -10 L-34 0 L-44 0 L-52 -20 L-60 -14 L-62 0Z', c) + trace('M-26 -54 l6 -9 l6 6 l6 -11 l6 8 l6 -12 l6 8 l6 -13 l6 7 l7 -9 l-2 20 l-40 12Z', c),
  bouc: (c) => trace('M-56 -2 L-52 -36 Q-62 -40 -66 -54 Q-54 -46 -46 -50 Q-20 -58 16 -54 Q28 -56 34 -66 Q26 -84 8 -88 Q30 -92 42 -74 Q48 -82 42 -100 Q58 -90 54 -72 Q72 -62 80 -52 L74 -44 L62 -46 L60 -28 L56 -20 L52 -34 Q46 -30 40 -26 L38 0 L30 0 L26 -24 Q0 -20 -26 -24 L-32 -6 L-28 0 L-36 0 L-44 -18 L-48 0Z', c),
  bouc_court: (c) => trace('M-56 -2 L-52 -40 Q-48 -52 -46 -50 Q-20 -58 16 -54 Q28 -56 34 -66 Q26 -84 8 -88 Q30 -92 42 -74 Q48 -82 42 -100 Q58 -90 54 -72 Q72 -62 80 -52 L74 -44 L62 -46 L60 -28 L56 -20 L52 -34 Q46 -30 40 -26 L38 0 L30 0 L26 -24 Q0 -20 -26 -24 L-32 -6 L-28 0 L-36 0 L-44 -18 L-48 0Z', c),
  singe: (c) => trace('M-20 0 L-24 -18 Q-34 -36 -26 -58 Q-18 -76 2 -76 Q-6 -92 8 -102 Q28 -110 38 -96 Q44 -82 30 -74 Q40 -60 40 -36 L52 -6 L46 0 L34 -22 L26 -28 Q20 -14 22 0 L12 0 L4 -26 L-8 -26 L-10 0Z', c) + `<path d="M-26 -22 Q-70 -14 -66 -58 Q-64 -80 -44 -78" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  lievre: (c) => trace('M-50 0 Q-66 -2 -62 -20 Q-56 -46 -20 -50 Q6 -52 22 -44 Q24 -50 22 -62 Q16 -92 8 -112 Q26 -100 32 -66 Q36 -92 38 -112 Q52 -90 42 -56 Q60 -46 62 -34 L46 -26 L30 -18 L38 0 L26 0 L14 -16 Q-6 -14 -18 -6 L-14 0 L-30 0 L-38 -8 L-44 0Z', c),
  elephant: (c) => trace('M-92 0 L-90 -66 Q-86 -116 -30 -120 Q24 -124 52 -102 Q70 -118 92 -106 Q118 -92 108 -60 Q116 -30 124 -6 Q126 2 118 2 Q102 -4 96 -38 Q90 -46 84 -46 L82 0 L58 0 L54 -40 L-6 -40 L-12 0 L-36 0 L-42 -36 L-60 -30 L-64 0Z', c) + trace('M60 -100 Q42 -106 36 -80 Q36 -56 52 -44 Q70 -60 76 -96Z', c) + `<path d="M-90 -74 Q-104 -56 -102 -28" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  hippopotame: (c) => trace('M-84 0 L-86 -30 Q-88 -76 -30 -84 Q20 -90 46 -74 Q60 -86 78 -78 Q104 -70 110 -48 Q112 -30 96 -26 Q76 -22 62 -26 Q58 -20 54 -14 L54 0 L32 0 L28 -14 L-30 -14 L-34 0 L-56 0 L-60 -14 L-64 0Z', c) + trace('M58 -80 l-2 -12 l10 8Z M76 -80 l2 -11 l6 10Z', c),
  lion: (c) => trace('M-74 0 L-72 -34 Q-68 -58 -36 -60 Q0 -62 22 -62 L18 -22 L22 0 L12 0 L4 -26 L-30 -26 L-40 -8 L-36 0 L-46 0 L-54 -18 L-60 -8 L-60 0Z', c) + `<path d="M-72 -40 Q-104 -52 -96 -82" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="-96" cy="-84" r="6" fill="${c}"/>` + trace('M6 -72 Q0 -102 24 -106 Q54 -112 62 -86 Q74 -76 82 -64 L74 -54 L60 -52 Q58 -30 40 -24 Q16 -22 8 -40Z M34 -24 L38 0 L28 0 L24 -24Z', c),
  boeuf: (c) => trace('M-82 0 L-80 -46 Q-92 -44 -94 -28 M-82 -50 Q-78 -74 -44 -72 Q-6 -66 24 -74 Q32 -88 42 -78 L48 -82 Q44 -110 66 -112 Q58 -102 62 -84 Q78 -100 96 -94 Q82 -90 76 -78 Q86 -66 96 -56 L88 -46 L70 -46 Q60 -36 50 -30 L50 0 L38 0 L32 -24 Q-10 -18 -44 -24 L-50 -6 L-46 0 L-58 0 L-64 -22 L-68 0Z', c),
  scorpion: (c) => trace('M-40 0 Q-46 -14 -30 -22 Q0 -30 34 -22 Q50 -16 44 -6 Q30 2 0 2 Q-20 2 -40 0Z', c) + `<path d="M-34 -14 Q-72 -20 -74 -56 Q-74 -86 -40 -82" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round"/>` + trace('M-42 -92 L-16 -82 L-42 -70Z', c) + `<path d="M40 -14 Q60 -30 70 -18 M70 -18 l18 -12 M70 -18 l20 4 M38 -6 Q58 -2 66 10 M66 10 l18 -10 M66 10 l20 6" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-20 -4 l-14 16 M-6 -2 l-6 16 M8 -2 l6 16 M22 -4 l14 16" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>`,
  oiseau: (c) => trace('M-58 -34 Q-30 -66 14 -60 Q30 -58 34 -70 Q36 -100 54 -110 Q68 -116 76 -106 L108 -98 L78 -94 Q62 -92 58 -74 Q54 -44 26 -32 Q-16 -18 -58 -34Z', c) + `<path d="M-8 -28 L-12 0 L-22 2 M10 -28 L8 0 L18 2" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  oiseau_vol: (c) => trace('M-72 -10 Q-40 -56 -12 -18 Q10 -60 58 -66 Q36 -36 22 -8 Q50 -4 74 -14 Q54 4 24 4 Q-4 8 -22 -4 Q-46 -22 -72 -10Z', c),
  crocodile: (c) => trace('M-130 -6 Q-90 -12 -62 -22 Q-30 -34 20 -30 Q60 -30 92 -22 L132 -18 Q138 -12 130 -8 L90 -6 L60 -2 L52 2 L44 -4 L-4 -4 L-14 4 L-24 -6 Q-70 -4 -130 -6Z', c) + trace('M-40 -28 l6 -8 l6 7 l6 -9 l6 8 l6 -9 l6 8 l6 -9 l6 8 l6 -8 l6 8 Z', c),
  silure: (c) => trace('M-90 -20 Q-110 -36 -116 -14 Q-112 -4 -90 -8 Q-40 8 30 2 Q70 -2 86 -14 Q70 -30 30 -32 Q-40 -36 -90 -20Z', c) + `<path d="M80 -12 Q100 -4 110 8 M82 -18 Q104 -24 114 -34" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  cheval: (c) => trace('M-74 0 L-72 -46 Q-96 -46 -98 -16 Q-108 -44 -80 -62 Q-40 -74 18 -66 Q38 -86 50 -110 L74 -118 L102 -94 L92 -84 L74 -92 Q68 -66 44 -48 L48 -24 L54 0 L44 0 L34 -34 Q0 -34 -40 -38 L-46 -14 L-40 0 L-50 0 L-58 -24 L-62 0Z', c),
  cavaliere: (c) => ANIMAUX.cheval(c) + trace('M-14 -72 Q-14 -112 2 -120 Q-8 -132 2 -144 Q18 -150 24 -136 Q26 -124 16 -118 Q28 -96 22 -68Z', c) + `<path d="M6 -112 Q28 -104 46 -96" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-30 -120 L-16 -152 M-22 -100 L-8 -158" stroke="${c}" stroke-width="2.5"/>`
};
export function animal(nom, x, y, s = 1, { cls = '', miroir = false, couleur = ENCRE } = {}) { return place(x, y, s, ANIMAUX[nom](couleur), cls, miroir); }

/* Une personne en boubou, drapée. */
export function humain(x, y, s = 1, { cls = '', couleur = ENCRE, geste = 'bas', miroir = false, coiffe = false } = {}) {
  const bras = { bas: 'M-14 -86 Q-26 -60 -24 -40 M14 -86 Q26 -60 24 -40', haut: 'M-14 -88 Q-30 -104 -30 -128 M14 -88 Q30 -104 30 -128', avant: 'M-12 -88 Q10 -76 36 -82 M12 -88 Q18 -66 16 -46', conte: 'M-12 -88 Q-30 -76 -34 -60 M12 -88 Q32 -96 46 -116' }[geste];
  return place(x, y, s, `<path d="M-6 -104 Q-22 -92 -24 -60 Q-30 -24 -34 0 L34 0 Q30 -24 24 -60 Q22 -92 6 -104Z" fill="${couleur}"/><circle cy="-116" r="12.5" fill="${couleur}"/>${coiffe ? `<path d="M-14 -122 Q0 -142 14 -122Z" fill="${couleur}"/>` : ''}<path d="${bras}" stroke="${couleur}" stroke-width="7" fill="none" stroke-linecap="round"/>`, cls, miroir);
}
/* Case ronde au toit de paille. */
export function case_(x, y, s = 1, couleur = ENCRE) {
  return place(x, y, s, `<path d="M-40 0 V-52 H40 V0Z" fill="${couleur}"/><path d="M-54 -46 L0 -104 L54 -46Z" fill="${couleur}"/>`);
}
/* Feu de veillée. */
export function feu(x, y, s = 1) {
  return place(x, y, s, `<circle cy="-34" r="86" fill="#ffb24c" opacity=".14"/><circle cy="-30" r="50" fill="#ffb24c" opacity=".22"/>
    <path d="M-34 4 L34 -6 M-34 -6 L34 4" stroke="${ENCRE}" stroke-width="8" stroke-linecap="round"/>
    <path class="anim-flamme" d="M0 -72 Q30 -36 18 -4 H-18 Q-30 -36 0 -72Z" fill="#f2682d"/>
    <path class="anim-flamme b" d="M2 -44 Q16 -24 9 -4 H-9 Q-14 -24 2 -44Z" fill="#ffd27a"/>`);
}
export const animaux = Object.keys(ANIMAUX);
