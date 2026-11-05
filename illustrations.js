/* =====================================================================
   Illustrations animées — Les voix du Faso
   Création originale du projet, inspirée des toiles de bogolan :
   figures simples aux motifs géométriques peints.
   Chaque scène contient des calques .et-1 … .et-4 : seul le calque du
   passage en cours (attribut data-etape de la figure) est visible.
   Les motifs (#p-points, #p-hachures…) sont définis une fois dans index.html.
   ===================================================================== */
import * as art from './art.js';

let palette = 'or'; // ambiance de la scène en cours de dessin
const C0 = () => art.PALETTES[palette];
const C = { toile: '#f7efdc', encre: '#0d1830', terre: '#8a5a38', ocre: '#d9672f', mil: '#eeb44f', indigo: '#22397a', vert: '#2f7a5a', eau: '#3f86a8', ciel: '#f6e3bd' };

const g = (classe, contenu, attributs = '') => `<g class="${classe}" ${attributs}>${contenu}</g>`;
const et = (etapes, contenu) => g('et ' + etapes.map((n) => 'et-' + n).join(' '), contenu);
const place = (x, y, s, contenu) => `<g transform="translate(${x} ${y}) scale(${s})">${contenu}</g>`;

/* ---------- Éléments de décor ---------- */
function eau(y, h = 60, couleur = C.eau) {
  return `<rect x="0" y="${y}" width="600" height="${h}" fill="${couleur}"/>
    <g class="anim-vague">${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 80 - 40} ${y + 18} q20 -10 40 0 t40 0" stroke="${C.toile}" stroke-width="2" fill="none" opacity=".7"/>`).join('')}</g>`;
}
function mur(x, y, w, h) {
  const rangs = [];
  for (let r = 0; r < h / 18; r++) for (let c = 0; c < w / 34; c++) {
    const dx = (r % 2) * 17;
    if (c * 34 + dx + 30 <= w) rangs.push(`<rect x="${x + c * 34 + dx}" y="${y + r * 18}" width="30" height="15" rx="3" fill="#a9937a" stroke="${C.encre}" stroke-width="2"/>`);
  }
  return rangs.join('');
}
function bulle(x, y, contenu) {
  const l = Math.max(42, Math.ceil(String(contenu).length * 3.7) + 12); // la bulle s'élargit avec le texte
  return place(x, y, 1, `<path d="M${8 - l} -22 H${l - 8} Q${l} -22 ${l} -14 V6 Q${l} 14 ${l - 8} 14 H-4 L-14 26 L-12 14 H${8 - l} Q${-l} 14 ${-l} 6 V-14 Q${-l} -22 ${8 - l} -22Z" fill="${C.toile}" stroke="${C.encre}" stroke-width="2"/>
    ${texte(0, 0, contenu, 15, art.ENCRE)}`);
}
const ciel = () => `<rect width="600" height="380" fill="url(#sc-${palette})"/>`;

/* ---------- Animaux du conte ---------- */

const miroir = (contenu, axe) => `<g transform="translate(${axe * 2} 0) scale(-1 1)">${contenu}</g>`;



/* ---------- Décor : le coucher du soleil, commun à toutes les scènes ---------- */
function texte(x, y, contenu, taille = 18, couleur = '#fff3d6', ancre = 'middle') {
  const contour = couleur === '#fff3d6' ? ` paint-order="stroke" stroke="${art.ENCRE}" stroke-opacity=".55" stroke-width="3"` : '';
  return `<text x="${x}" y="${y}" font-family="Lexend, system-ui, sans-serif" font-size="${taille}" font-weight="500" fill="${couleur}" text-anchor="${ancre}"${contour}>${contenu}</text>`;
}
function soleil(x, y, r = 30) {
  const p = C0();
  return `<g class="anim-soleil"><circle cx="${x}" cy="${y}" r="${r * 3.4}" fill="url(#sc-${palette}-s)"/></g>`;
}
function lune(x, y) { return `<circle cx="${x}" cy="${y}" r="70" fill="url(#sc-nuit-s)"/>`; }
function etoiles(n = 26, hauteur = 170) { return art.etoiles(600, hauteur, n, 3); }
function nuit() { return `<rect width="600" height="380" fill="url(#sc-nuit)"/>${etoiles(50, 230)}${art.collines(600, 380, 262, 16, '#22397a', 4)}`; }
function sol(y = 300) {
  const p = C0();
  return `<g class="plan-loin">${art.collines(600, 380, y - 34, 14, p[3], 3).replace('/>', ' opacity=".55"/>')}${art.collines(600, 380, y - 12, 10, p[2], 6)}</g>
    <path d="M0 ${y} Q150 ${y - 7} 300 ${y} T600 ${y} V380 H0Z" fill="${p[1]}"/><path d="M0 ${y + 40} Q200 ${y + 30} 400 ${y + 42} T600 ${y + 38} V380 H0Z" fill="${art.ENCRE}" opacity=".35"/>
    ${art.herbes(600, 376, art.ENCRE, 4, 46)}`;
}
const case_ = (x, y, s = 1) => art.case_(x, y, s * 0.75);
const arbre = (x, y, s = 1) => (x % 3 ? art.acacia(x, y + 2, s * 1.05, x % 7 + 1, art.ENCRE, 'anim-balance') : art.baobab(x, y + 2, s * 1.05, x % 7 + 1, art.ENCRE, 'anim-balance'));
function personne(x, y, s = 1, { bras = 'bas', cls = '' } = {}) {
  const geste = { bas: 'bas', haut: 'haut', avant: 'avant', offre: 'avant' }[bras] ?? 'bas';
  return art.humain(x, y, s * 0.68, { geste, cls });
}
const cheval = (x, y, s = 1, cavalier = false, cls = '') => art.animal(cavalier ? 'cavaliere' : 'cheval', x, y + 34, s * 0.82, { cls });
const lievre = (x, y, s = 1, cls = '') => art.animal('lievre', x, y + 2, s * 0.62, { cls });
const hyene = (x, y, s = 1, cls = '') => art.animal('hyene', x, y + 18, s * 0.72, { cls });
const bouc = (x, y, s = 1, cls = '', queue = true) => art.animal(queue ? 'bouc' : 'bouc_court', x, y + 8, s * 0.72, { cls });
const singe = (x, y, s = 1, cls = '') => art.animal('singe', x, y + 8, s * 0.75, { cls });
const elephant = (x, y, s = 1, cls = '') => art.animal('elephant', x, y + 10, s * 0.7, { cls });
const hippopotame = (x, y, s = 1, cls = '') => art.animal('hippopotame', x, y + 9, s * 0.72, { cls });
const lion = (x, y, s = 1, cls = '') => art.animal('lion', x, y + 10, s * 0.8, { cls });
const boeuf = (x, y, s = 1, cls = '') => art.animal('boeuf', x, y + 9, s * 0.72, { cls });
const scorpion = (x, y, s = 1, cls = '') => art.animal('scorpion', x, y + 4, s * 0.72, { cls });
const piqueBoeuf = (x, y, s = 1, cls = '') => art.animal('oiseau', x, y + 22, s * 0.62, { cls });
const crocodile = (x, y, s = 1, cls = '') => art.animal('crocodile', x, y, s * 0.72, { cls });
const silure = (y, s, cls, delai = 0) => g(cls, art.animal('silure', 0, y, s * 0.55, { couleur: '#021423' }), `style="animation-delay:${delai}s"`);

/* ---------- Scènes ---------- */
const SCENES = {
  puits: () => `${ciel()}${soleil(520, 70)}${arbre(80, 300, 1.1)}${sol(300)}
    ${place(300, 300, 1, `<rect x="-46" y="-50" width="92" height="50" fill="#a9937a" stroke="${C.encre}" stroke-width="2.25"/><rect x="-46" y="-50" width="92" height="50" fill="url(#p-croix)"/>
      <ellipse cx="0" cy="-50" rx="46" ry="10" fill="${C.encre}"/>
      <path d="M-40 -50 V-130 M40 -50 V-130 M-50 -130 H50" stroke="${C.encre}" stroke-width="7" stroke-linecap="round"/>`)}
    ${et([1, 2], `<path d="M300 170 V218" stroke="${C.encre}" stroke-width="2.25"/><rect x="290" y="218" width="20" height="16" fill="${C.ocre}" stroke="${C.encre}" stroke-width="2"/>`)}
    ${et([3], `<path d="M300 170 V190" stroke="${C.encre}" stroke-width="2.25"/><g class="anim-chute"><path d="M300 200 V214" stroke="${C.encre}" stroke-width="2.25"/><rect x="290" y="214" width="20" height="16" fill="${C.ocre}" stroke="${C.encre}" stroke-width="2"/></g>`)}
    ${et([4], `<path d="M300 170 V222" stroke="${C.ocre}" stroke-width="6"/><rect x="288" y="222" width="24" height="18" fill="${C.mil}" stroke="${C.encre}" stroke-width="2"/>`)}
    ${et([1], lievre(190, 330, 1.1, 'anim-saut') + hyene(440, 336, 1.1))}
    ${et([2], lievre(190, 330, 1.1) + hyene(352, 336, 1.1) + bulle(205, 230, '« Et après ? »'))}
    ${et([3], lievre(150, 330, 1) + hyene(380, 336, 1) + personne(470, 340, 1, { habit: C.indigo, cls: 'anim-arrive' }) + personne(520, 340, 1, { habit: C.vert, cls: 'anim-arrive' }) + personne(565, 340, 1, { habit: C.ocre, cls: 'anim-arrive' }))}
    ${et([4], lievre(170, 330, 1) + hyene(420, 336, 1) + personne(230, 345, 0.9, { habit: C.indigo, bras: 'haut' }) + personne(500, 345, 0.9, { habit: C.vert, bras: 'haut' }) + personne(545, 345, 0.9, { habit: C.ocre, bras: 'haut' }))}`,

  yennenga: () => `
    ${et([1, 2, 4], ciel() + soleil(500, 70, 26))}
    ${et([3], nuit() + lune(500, 70))}
    ${sol(300)}
    ${et([1], case_(90, 300, 1) + case_(180, 300, 0.8) + cheval(380, 296, 1.25, true))}
    ${et([2], Array.from({ length: 11 }, (_, i) => `<g class="anim-fane" style="animation-delay:${(i % 4) * 0.2}s">${place(60 + i * 48, 300, 1, `<path d="M0 0 V-62" stroke="${C.terre}" stroke-width="4"/><path d="M0 -40 q-16 -4 -20 -16 M0 -26 q16 -4 20 -14" stroke="${C.terre}" stroke-width="2.25" fill="none"/><ellipse cx="0" cy="-66" rx="5" ry="10" fill="${C.mil}" stroke="${C.encre}" stroke-width="2"/>`)}</g>`).join('') + personne(560, 360, 0.8, { habit: C.ocre }))}
    ${et([3], eau(316, 40, '#3c5c78') + g('anim-galop', cheval(0, 296, 1.2, true)))}
    ${et([4], arbre(70, 300, 1.2) + arbre(540, 300, 1) + case_(170, 300, 0.9) + personne(270, 340, 1.1, { habit: C.vert }) + personne(330, 340, 1.1, { habit: C.ocre }) + personne(300, 345, 0.65, { habit: C.mil }) + cheval(450, 296, 0.95) + texte(300, 120, '« Ouédraogo » : l’étalon', 24))}`,

  yako: () => `${ciel()}${sol(300)}
    ${et([1], soleil(500, 80) + case_(130, 300) + case_(230, 300, 0.8) + arbre(380, 300) + texte(300, 120, 'Yako · 1949', 28))}
    ${et([2], soleil(500, 80) + [120, 190, 260, 340, 410, 480].map((x, i) => personne(x, 345, 1, { habit: [C.ocre, C.indigo, C.vert][i % 3], bras: i % 2 ? 'haut' : 'bas' })).join('') + texte(300, 120, '4 août 1983', 28))}
    ${et([3], `<path d="M300 300 V90" stroke="${C.encre}" stroke-width="6"/><g class="anim-monte">${place(303, 96, 1, `<rect width="120" height="40" fill="#c8102e"/><rect y="40" width="120" height="40" fill="#009a3d"/><path d="M60 26 l6 14 h15 l-12 9 l5 15 l-14 -9 l-14 9 l5 -15 l-12 -9 h15Z" fill="#fcd116"/>`)}</g>` + texte(300, 340, '1984 : Haute-Volta → Burkina Faso', 20, C.toile))}
    ${et([4], place(240, 110, 1, `<rect width="120" height="40" fill="#c8102e"/><rect y="40" width="120" height="40" fill="#009a3d"/><path d="M60 26 l6 14 h15 l-12 9 l5 15 l-14 -9 l-14 9 l5 -15 l-12 -9 h15Z" fill="#fcd116"/>`) + texte(300, 250, 'BURKINA FASO', 36) + texte(300, 280, 'la patrie des hommes intègres', 18, C.terre))}`,

  diaba: () => `${nuit()}
    <path d="M140 380 Q300 200 460 380Z" fill="${C.terre}" stroke="${C.encre}" stroke-width="2.25"/><path d="M140 380 Q300 200 460 380Z" fill="url(#p-points)" opacity=".4"/>
    ${et([1], lune(480, 70) + g('anim-chute-etoile', `<path d="M380 40 L300 200" stroke="${C.mil}" stroke-width="2.25" opacity=".8"/><circle cx="300" cy="200" r="6" fill="${C.mil}"/>`))}
    ${et([2, 3], `<circle cx="300" cy="226" r="40" fill="${C.mil}" opacity=".25" class="anim-pulse"/>` + personne(300, 290, 1.1, { habit: C.mil, bras: 'haut' }))}
    ${et([3, 4], case_(110, 380, 0.8) + case_(490, 380, 0.8) + personne(200, 372, 0.8, { habit: C.ocre, cls: 'anim-arrive' }) + personne(400, 372, 0.8, { habit: C.vert, cls: 'anim-arrive' }) + texte(300, 70, 'Bingo, XIIIᵉ siècle', 26, C.toile))}
    ${et([4], bulle(180, 200, 'Version 1') + bulle(420, 180, 'Version 2') + bulle(300, 120, '… ?'))}`,

  dafra: () => `${ciel('#d8c49e')}
    <path d="M0 80 L150 140 L190 300 L0 300Z" fill="#8a6b4f" stroke="${C.encre}" stroke-width="2.25"/><path d="M600 60 L450 150 L420 300 L600 300Z" fill="#8a6b4f" stroke="${C.encre}" stroke-width="2.25"/>
    <path d="M0 80 L150 140 L190 300 L0 300Z M600 60 L450 150 L420 300 L600 300Z" fill="url(#p-hachures)" opacity=".5"/>
    ${eau(300, 80)}
    ${et([1], `<path d="M60 110 Q160 170 200 290" stroke="${C.toile}" stroke-width="4" stroke-dasharray="8 8" fill="none"/>` + g('anim-descend', personne(70, 130, 0.8, { habit: C.indigo })))}
    ${et([2, 3], silure(330, 1, 'anim-nage') + silure(355, 0.8, 'anim-nage r', -3))}
    ${et([3], personne(250, 300, 0.9, { habit: C.vert, bras: 'offre' }) + `<ellipse cx="282" cy="268" rx="13" ry="7" fill="${C.mil}" stroke="${C.encre}" stroke-width="2"/>`)}
    ${et([4], silure(340, 0.9, 'anim-nage') + place(300, 150, 1, `<path d="M-50 -60 H50 V0 Q50 40 0 60 Q-50 40 -50 0Z" fill="${C.toile}" stroke="${C.encre}" stroke-width="4"/>${place(0, 0, 0.8, `<path d="M-46 0 Q-10 -14 34 -4 Q46 0 34 6 Q-10 14 -46 0Z" fill="${C.encre}"/><path d="M-44 0 L-64 -12 L-62 12Z" fill="${C.encre}"/><path d="M36 2 Q50 12 58 22 M36 -2 Q52 -6 60 -14" stroke="${C.encre}" stroke-width="2" fill="none"/>`)}`)
      + `<g class="anim-flotte"><path d="M120 322 q8 -10 16 0 q-8 6 -16 0Z M480 330 q8 -10 16 0 q-8 6 -16 0Z" fill="#fff" stroke="${C.encre}" stroke-width="1.5"/></g>`)}`,

  bazoule: () => `${ciel('#ecd29e')}${soleil(510, 70, 34)}${sol(290, '#a8784a')}
    <path d="M40 320 l30 12 l-10 20 M200 310 l20 18 l30 -6 M380 330 l-20 16 l26 14 M500 306 l18 22" stroke="${C.encre}" stroke-width="2" fill="none"/>
    ${et([1], [140, 230, 320].map((x, i) => g('anim-marche', personne(x, 330, 1, { habit: [C.ocre, C.indigo, C.vert][i] }) + `<ellipse cx="${x}" cy="252" rx="14" ry="10" fill="${C.terre}" stroke="${C.encre}" stroke-width="2"/>`, `style="animation-delay:${i * 0.3}s"`)).join(''))}
    ${et([2], crocodile(250, 330, 0.9, 'anim-rampe') + crocodile(400, 352, 0.8, 'anim-rampe') + personne(90, 340, 0.9, { habit: C.ocre, bras: 'avant' }))}
    ${et([3, 4], `<ellipse cx="320" cy="335" rx="190" ry="32" fill="${C.eau}" stroke="${C.encre}" stroke-width="2.25"/><ellipse cx="320" cy="335" rx="150" ry="18" fill="none" stroke="${C.toile}" stroke-width="2" class="anim-onde"/>`)}
    ${et([3], crocodile(280, 336, 0.7) + crocodile(400, 332, 0.6) + personne(80, 340, 0.9, { habit: C.ocre, bras: 'haut' }) + personne(130, 340, 0.9, { habit: C.indigo, bras: 'haut' }))}
    ${et([4], crocodile(320, 336, 0.7) + personne(450, 330, 0.9, { habit: C.vert }) + g('anim-danse', personne(80, 340, 0.9, { habit: C.ocre, bras: 'haut' }) + personne(140, 340, 0.9, { habit: C.indigo, bras: 'haut' }))
      + place(540, 340, 1, `<path d="M-16 0 L-20 -44 L20 -44 L16 0Z" fill="${C.ocre}" stroke="${C.encre}" stroke-width="2.25"/><ellipse cx="0" cy="-44" rx="20" ry="6" fill="${C.toile}" stroke="${C.encre}" stroke-width="2"/>`) + texte(300, 150, 'Koom Lakré', 30))}`,

  loropeni: () => `
    ${et([1, 2, 4], ciel())}${et([1, 2], soleil(520, 70, 24))}${et([3], nuit() + lune(500, 70))}
    ${sol(310, '#8f6a45')}${arbre(560, 310, 0.8)}
    ${mur(60, 166, 210, 144)}${mur(320, 196, 200, 114)}
    ${et([1], texte(300, 120, '≈ 6 mètres de haut', 24))}
    ${et([2], [0, 1, 2].map((i) => g('anim-marche', personne(120 + i * 70, 360, 0.9, { habit: [C.ocre, C.indigo, C.vert][i] }) + `<circle cx="${120 + i * 70}" cy="294" r="9" fill="${C.mil}" stroke="${C.encre}" stroke-width="2"/>`, `style="animation-delay:${i * 0.25}s"`)).join('') + texte(300, 120, 'XIVᵉ – XVIIᵉ siècle : le temps de l’or', 22))}
    ${et([3], `<g fill="none" stroke="${C.vert}" stroke-width="5" stroke-linecap="round"><path class="anim-trace" d="M80 310 Q100 250 90 200 Q110 180 120 166"/><path class="anim-trace" d="M230 310 Q210 240 250 210 Q240 186 262 170"/><path class="anim-trace" d="M360 310 Q380 260 350 230 Q370 210 380 196"/><path class="anim-trace" d="M490 310 Q470 260 500 220"/></g>`)}
    ${et([4], place(440, 96, 0.85, `<circle r="52" fill="${C.toile}" stroke="${C.encre}" stroke-width="4"/><circle r="40" fill="none" stroke="${C.ocre}" stroke-width="2.25" stroke-dasharray="6 5" class="anim-tourne"/>${texte(0, 8, '2009', 26)}`) + texte(440, 176, 'Patrimoine mondial', 20))}`,

  diebougou: () => `
    ${et([1, 2, 4], ciel())}${et([1, 2, 4], soleil(530, 64, 24))}${et([3], nuit() + lune(520, 66))}
    ${sol(304)}${arbre(56, 304, 0.9)}
    <path d="M96 306 Q130 214 196 174 Q250 130 330 126 Q414 122 466 166 Q530 220 566 306Z" fill="#b5532f" stroke="${C.encre}" stroke-width="2.25"/><path d="M96 306 Q130 214 196 174 Q250 130 330 126 Q414 122 466 166 Q530 220 566 306Z" fill="url(#p-points)" opacity=".35"/>
    ${et([2, 3, 4], `<circle cx="318" cy="276" r="46" fill="${C.mil}" opacity=".3" class="anim-pulse"/>`)}
    <path d="M286 306 V250 Q318 212 350 250 V306Z" fill="${C.encre}"/>
    ${et([1], `<g class="anim-pulse">${texte(318, 196, '?', 40)}</g>` + texte(300, 82, '« Le trou de la guerre »', 26))}
    ${et([2], [0, 1, 2].map((i) => g('anim-marche', personne(140 + i * 62, 352, 0.9, { habit: [C.ocre, C.indigo, C.vert][i] }) + `<ellipse cx="${140 + i * 62}" cy="276" rx="14" ry="10" fill="${C.terre}" stroke="${C.encre}" stroke-width="2"/>`, `style="animation-delay:${i * 0.3}s"`)).join('') + texte(300, 82, 'Pendant la colonisation ?', 24))}
    ${et([3], personne(470, 352, 0.95, { habit: C.mil }) + bulle(470, 228, '« Personne n’en parle »') + texte(250, 82, '1914 – 1918 ?', 26, C.toile))}
    ${et([4], personne(180, 352, 1, { habit: C.indigo, bras: 'avant' }) + [430, 480, 530].map((x) => personne(x, 360, 0.65, { habit: C.ocre, cls: 'anim-arrive' })).join('') + texte(300, 82, 'Une énigme à étudier', 26))}`,

  diapaga: () => `${ciel()}${et([1, 2, 4], soleil(500, 70, 26))}${sol(300, '#a8784a')}
    ${et([1], case_(80, 300, 0.9) + case_(170, 300, 0.7) + `<g class="anim-fumee">${[0, 1, 2].map((i) => `<circle cx="${110 + i * 22}" cy="${200 - i * 16}" r="${10 + i * 5}" fill="#cfc2ad" opacity=".8"/>`).join('')}</g>`
      + [0, 1, 2].map((i) => g('anim-exil', personne(260 + i * 60, 340, 0.9, { habit: [C.ocre, C.indigo, C.vert][i] }), `style="animation-delay:${i * 0.4}s"`)).join('') + texte(300, 110, 'Bornou, XVIIᵉ siècle', 26))}
    ${et([2, 3], eau(300, 80, '#3c5c78') + texte(520, 290, 'Niger', 18, C.encre))}
    ${et([2], personne(110, 300, 1.1, { habit: C.indigo, bras: 'haut', cls: 'anim-geste' }) + personne(50, 300, 0.9, { habit: C.ocre }) + `<g class="anim-onde-son">${[24, 40, 56].map((r) => `<path d="M${150 + r * 0.2} ${190 - r * 0.6} a${r} ${r} 0 0 1 0 ${r * 1.2}" stroke="${C.toile}" stroke-width="2.25" fill="none"/>`).join('')}</g>` + texte(330, 120, 'Le fleuve barre la route', 24))}
    ${et([3], `<g class="anim-flotte"><path d="M20 332 C110 312 170 352 260 330 S410 310 530 334" stroke="${C.encre}" stroke-width="28" fill="none" stroke-linecap="round"/><path d="M20 332 C110 312 170 352 260 330 S410 310 530 334" stroke="#6b5530" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M20 332 C110 312 170 352 260 330 S410 310 530 334" stroke="${C.mil}" stroke-width="6" stroke-dasharray="5 16" fill="none"/><ellipse cx="550" cy="334" rx="26" ry="15" fill="#6b5530" stroke="${C.encre}" stroke-width="2.25"/><circle cx="558" cy="328" r="3" fill="${C.mil}"/><path d="M575 336 l14 -4 m-14 4 l14 5" stroke="${C.ocre}" stroke-width="2.25" stroke-linecap="round"/></g>`
      + [0, 1, 2].map((i) => g('anim-marche', personne(170 + i * 110, 322, 0.7, { habit: [C.ocre, C.indigo, C.vert][i] }), `style="animation-delay:${i * 0.3}s"`)).join('') + texte(300, 110, 'Un boa géant', 28))}
    ${et([4], case_(90, 300, 0.9) + case_(510, 300, 0.85) + personne(220, 345, 1.05, { habit: C.vert, bras: 'offre' }) + personne(380, 345, 1.05, { habit: C.indigo, bras: 'avant' }) + `<ellipse cx="300" cy="300" rx="16" ry="9" fill="${C.mil}" stroke="${C.encre}" stroke-width="2"/>`
      + texte(300, 110, 'Diapaga', 30) + texte(300, 140, '« dia » homme · « kpaga » célibataire', 18))}`,

  ziniare: () => `${ciel()}${soleil(520, 64, 24)}${sol(300)}${arbre(560, 300, 0.85)}
    ${et([1, 2], case_(70, 300, 0.9) + place(250, 316, 1, `<path d="M-60 0 H60 L50 -14 H-50Z" fill="${C.terre}" stroke="${C.encre}" stroke-width="2"/>${[-36, -12, 12, 36].map((x) => `<ellipse cx="${x}" cy="-20" rx="11" ry="6" fill="${C.mil}" stroke="${C.encre}" stroke-width="1.5"/>`).join('')}`))}
    ${et([1], personne(170, 345, 1.05, { habit: C.ocre, bras: 'offre' }) + personne(360, 345, 1, { habit: C.indigo, bras: 'avant' })
      + `<g class="anim-pulse">${[0, 1, 2].map((i) => `<ellipse cx="${318 + i * 12}" cy="${262 - (i % 2) * 6}" rx="5" ry="3.5" fill="#fff" stroke="${C.encre}" stroke-width="1.2"/>`).join('')}</g>` + texte(300, 110, 'Des galettes contre des cauris', 24))}
    ${et([2], personne(170, 345, 1.05, { habit: C.ocre, bras: 'haut' }) + [330, 390, 450, 510].map((x, i) => personne(x, 350 + (i % 2) * 8, 0.85, { habit: [C.indigo, C.vert, C.mil, C.ocre][i], bras: i % 2 ? 'haut' : 'bas', cls: 'anim-arrive' })).join('') + bulle(420, 214, '« Du jamais vu ! »') + texte(300, 100, 'Ziniaré', 30))}
    ${et([3], g('anim-galop-court', cheval(250, 296, 1.15, true)) + `<g class="anim-fumee">${[0, 1, 2].map((i) => `<circle cx="${470 + i * 20}" cy="${250 - i * 14}" r="${9 + i * 5}" fill="#cfc2ad" opacity=".8"/>`).join('')}</g>` + case_(90, 300, 0.8) + texte(300, 110, 'Naaba Oubri', 30))}
    ${et([4], place(300, 310, 1, `<path d="M-120 0 V-70 H120 V0Z" fill="#c99a6a" stroke="${C.encre}" stroke-width="2.25"/><path d="M-120 0 V-70 H120 V0Z" fill="url(#p-hachures)" opacity=".35"/>${[-90, -30, 30, 90].map((x) => `<path d="M${x} -70 V-88" stroke="${C.encre}" stroke-width="6"/>`).join('')}<path d="M-16 0 V-38 Q0 -52 16 -38 V0Z" fill="${C.encre}"/>`) + personne(470, 350, 0.85, { habit: C.indigo }) + texte(300, 120, 'Oubriyaoghin · mausolée (2002)', 24))}`,

  tiebele: () => `${ciel()}${soleil(530, 60, 22)}${sol(310)}
    <path d="M20 310 V250 H580 V310" fill="none" stroke="${C.encre}" stroke-width="5" stroke-dasharray="1 0"/>
    ${[['dinian', 140], ['mangolo', 300], ['draa', 460]].map(([type, x]) => {
      const forme = type === 'dinian' ? `<path d="M-70 0 V-60 Q-70 -84 -35 -84 Q0 -84 0 -64 Q0 -84 35 -84 Q70 -84 70 -60 V0Z"/>` : type === 'mangolo' ? `<rect x="-50" y="-80" width="100" height="80"/>` : `<path d="M-42 0 V-64 Q-42 -88 0 -88 Q42 -88 42 -64 V0Z"/>`;
      return place(x, 310, 1, `<g fill="#c99a6a" stroke="${C.encre}" stroke-width="2.25">${forme}</g>
        <g class="et et-3 et-4">${forme.replace('<path ', `<path fill="url(#p-kassena)" class="anim-peint" `).replace('<rect ', `<rect fill="url(#p-kassena)" class="anim-peint" `)}</g>
        <path d="M-10 0 V-26 Q0 -36 10 -26 V0Z" fill="${C.encre}"/>
        ${et([2], texte(0, -100, type, 16))}`);
    }).join('')}
    ${et([1], texte(300, 120, 'Cour royale · XVIᵉ siècle', 26))}
    ${et([3], personne(220, 360, 0.8, { habit: C.ocre, bras: 'avant' }) + personne(380, 360, 0.8, { habit: C.indigo, bras: 'avant' }))}
    ${et([4], texte(300, 130, '26 juillet 2024 · Patrimoine mondial', 22))}`,

  kango: () => `${ciel()}${sol(300, '#9a7048')}
    ${et([1, 2], eau(300, 80, '#3c5c78') + texte(520, 290, 'Niger', 18, C.encre))}
    ${et([1], soleil(90, 70, 24) + g('anim-exil', personne(160, 300, 1.1, { habit: C.indigo })) + texte(300, 110, '1754 : l’exil', 26))}
    ${et([2], soleil(90, 70, 24) + case_(470, 300, 0.9) + personne(330, 300, 1.1, { habit: C.indigo }) + personne(390, 300, 1, { habit: C.ocre, bras: 'avant' }) + texte(300, 110, 'Ségou', 28))}
    ${et([3], soleil(500, 70, 24) + g('anim-galop-court', cheval(240, 300, 1, true) + cheval(380, 306, 0.9, true)) + `<g class="anim-fumee">${[0, 1, 2].map((i) => `<circle cx="${190 + i * 18}" cy="${190 - i * 12}" r="${8 + i * 4}" fill="#cfc2ad" opacity=".8"/>`).join('')}</g>` + texte(300, 110, '1757 : le retour', 26))}
    ${et([4], soleil(500, 70, 24) + place(300, 300, 1, `<rect x="-90" y="-90" width="180" height="90" fill="${C.ocre}" stroke="${C.encre}" stroke-width="2.25"/><rect x="-90" y="-90" width="180" height="90" fill="url(#p-hachures)" opacity=".5"/><path d="M-100 -90 H100" stroke="${C.encre}" stroke-width="6"/><path d="M-60 -90 v-22 M0 -90 v-30 M60 -90 v-22" stroke="${C.encre}" stroke-width="6"/><path d="M-14 0 V-40 H14 V0Z" fill="${C.encre}"/>`)
      + [80, 140, 460, 520].map((x) => place(x, 356, 1, `<path d="M-20 0 Q-4 -30 22 -18" stroke="${C.encre}" stroke-width="14" fill="none" stroke-linecap="round"/><circle cx="30" cy="-12" r="9" fill="${C.encre}"/>`)).join('') + texte(300, 120, 'Wayugyã : « venez vous prosterner »', 22))}`,

  guimbi: () => `${ciel()}${soleil(530, 64, 22)}${sol(310)}
    ${place(110, 310, 1, `<path d="M-60 0 V-110 H60 V0Z" fill="#c99a6a" stroke="${C.encre}" stroke-width="2.25"/>${[-60, -20, 20, 60].map((x) => `<path d="M${x} -110 V-130" stroke="${C.encre}" stroke-width="6"/>`).join('')}${[-40, 0, 40].map((x) => `<path d="M${x - 6} -60 h12 M${x - 6} -80 h12" stroke="${C.encre}" stroke-width="4"/>`).join('')}<path d="M-12 0 V-34 Q0 -46 12 -34 V0Z" fill="${C.encre}"/>`)}
    ${et([1], personne(260, 360, 0.75, { habit: C.mil }) + personne(320, 350, 1.05, { habit: C.indigo }) + texte(380, 120, 'vers 1836', 26))}
    ${et([2], personne(250, 350, 1.05, { habit: C.ocre, bras: 'avant' }) + [380, 440, 500].map((x) => g('anim-arrive', personne(x, 350, 1, { habit: '#ddd2bd' }) + `<path d="M${x - 16} ${350 - 74} h32 l-6 -8 h-20Z" fill="${C.encre}"/>`)).join(''))}
    ${et([3], personne(260, 350, 1.05, { habit: C.ocre, bras: 'offre' }) + personne(420, 350, 1.05, { habit: C.indigo }) + `<ellipse cx="340" cy="300" rx="16" ry="9" fill="${C.toile}" stroke="${C.encre}" stroke-width="2"/><path d="M332 296 q8 -14 16 0" stroke="${C.ocre}" stroke-width="2" fill="none" class="anim-pulse"/>` + texte(340, 120, 'Une alliance', 26))}
    ${et([4], place(400, 310, 1, `<path d="M-70 0 V-80 H70 V0Z" fill="${C.toile}" stroke="${C.encre}" stroke-width="2.25"/><rect x="-56" y="-62" width="112" height="24" fill="${C.mil}" stroke="${C.encre}" stroke-width="2"/>${texte(0, -44, 'Maternité', 15)}<path d="M-10 0 V-24 H10 V0Z" fill="${C.encre}"/>`) + texte(400, 140, 'Guimbi Ouattara', 26) + texte(400, 168, '1836 – 1919', 18, C.terre))}`,

  bouc: () => `${ciel()}${soleil(530, 60, 24)}${sol(300)}${arbre(70, 300, 1.1)}${arbre(530, 300, 0.9)}
    ${et([1], case_(120, 306, 1) + personne(190, 340, 0.9, { habit: C.indigo, bras: 'avant' }) + bouc(330, 345, 1.1, 'anim-marche') + bulle(190, 216, '« Pas si loin ! »'))}
    ${et([2], hyene(190, 345, 1.1, 'anim-danse') + miroir(bouc(180, 345, 1.1), 300) + bulle(420, 230, '♪ La mère l’a dit… ♪'))}
    ${et([3], hyene(170, 345, 1.1, 'anim-marche') + bouc(420, 345, 1.1, 'anim-saut'))}
    ${et([4], case_(500, 306, 1) + bouc(400, 345, 1.1, 'anim-saut', false) + hyene(210, 345, 1.1) + texte(300, 372, 'Depuis, la queue du bouc est courte', 16, C.toile))}`,

  corde: () => `${ciel()}${soleil(300, 60, 24)}${sol(300)}
    ${et([1], arbre(120, 300, 1.2) + `<path d="M126 290 Q300 318 470 330" stroke="${C.ocre}" stroke-width="5" fill="none"/>` + lievre(470, 340, 1.2, 'anim-marche'))}
    ${et([2], elephant(120, 340, 0.9, 'anim-marche') + miroir(hippopotame(50, 340, 1, 'anim-marche'), 300) + `<path d="M200 320 H420" stroke="${C.ocre}" stroke-width="5"/>` + lievre(310, 372, 0.6, 'anim-saut'))}
    ${et([3], elephant(140, 340, 1) + miroir(bouc(100, 342, 1.2), 300) + bulle(380, 240, '« Son doigt est terrible ! »'))}
    ${et([4], miroir(elephant(40, 340, 0.8), 300) + lievre(190, 340, 1.2, 'anim-saut') + `<path d="M120 340 q6 -24 12 0 M145 342 q6 -24 12 0 M250 342 q6 -24 12 0" stroke="${C.vert}" stroke-width="4" fill="none"/>`)}`,

  singe: () => `${ciel('#ecd29e')}${arbre(500, 300, 1.8)}${sol(300, '#a8784a')}
    ${et([1, 2], `<ellipse cx="240" cy="338" rx="110" ry="30" fill="${C.encre}"/>`)}
    ${et([1], hyene(230, 332, 0.9, 'anim-saut') + singe(410, 345, 1.1, 'anim-marche'))}
    ${et([2], hyene(240, 322, 1) + singe(380, 340, 1.1, 'anim-danse') + bulle(420, 230, '« Lâche ma queue ! »'))}
    ${et([3], hyene(150, 345, 1) + singe(280, 345, 1) + lievre(400, 345, 1.1, 'anim-danse') + bulle(400, 244, '« Mains sur les yeux ! »'))}
    ${et([4], hyene(170, 345, 1.1) + singe(500, 172, 1, 'anim-danse') + lievre(350, 355, 0.9, 'anim-exil'))}`,

  marigot: () => `${ciel()}${soleil(520, 64, 28)}${sol(280, '#b08a58')}
    ${et([1], eau(300, 56) + boeuf(120, 290, 0.9) + hyene(450, 288, 0.9, 'anim-marche'))}
    ${et([2, 3, 4], `<ellipse cx="300" cy="332" rx="250" ry="36" fill="#c9a877" stroke="${C.encre}" stroke-width="2.25"/><path d="M130 326 l40 12 l30 -8 M280 318 l24 22 l40 -6 M400 332 l40 -10" stroke="${C.encre}" stroke-width="2" fill="none"/>`)}
    ${et([2], boeuf(120, 290, 0.9) + hyene(450, 288, 0.9) + bulle(300, 196, '« Où boire, maintenant ? »'))}
    ${et([3], lion(150, 330, 1.3, 'anim-arrive') + hyene(440, 330, 0.9, 'anim-saut') + bulle(190, 196, '« Qui a tout bu ? »'))}
    ${et([4], lion(190, 325, 1.2, 'anim-saut') + boeuf(440, 330, 1) + bulle(440, 216, '« Ses narines sont mouillées ! »'))}`,

  veillee: () => `${nuit()}${lune(520, 62)}${sol(290, '#3a2416')}${arbre(84, 290, 1.25)}
    ${place(300, 330, 1, `<path d="M-28 6 L28 -2 M-28 -2 L28 6" stroke="${C.terre}" stroke-width="8" stroke-linecap="round"/>
      <path class="anim-danse" d="M0 -46 Q24 -18 12 0 H-12 Q-24 -18 0 -46Z" fill="${C.ocre}"/><path class="anim-danse" d="M0 -26 Q10 -12 6 0 H-6 Q-10 -12 0 -26Z" fill="${C.mil}"/>`)}
    ${personne(220, 330, 1.2, { habit: C.indigo, bras: 'haut', cls: 'anim-geste' })}
    <g class="anim-onde-son">${[24, 40, 56].map((r) => `<path d="M${248 + r * 0.2} ${250 - r * 0.6} a${r} ${r} 0 0 1 0 ${r * 1.2}" stroke="${C.toile}" stroke-width="2.25" fill="none"/>`).join('')}</g>
    ${[390, 450, 510].map((x, i) => personne(x, 350, 0.9, { habit: [C.ocre, C.vert, C.mil][i] })).join('')}
    ${hyene(120, 276, 0.5, 'anim-cligne')}`,

  scorpion: () => `${ciel('#f0c98a')}${soleil(500, 74, 30)}${sol(290, '#a8784a')}${arbre(70, 290, 1.1)}
    ${et([1], hyene(190, 340, 1.1) + miroir(scorpion(170, 340, 1.1), 300) + bulle(190, 222, '« Comment ça va ? »'))}
    ${et([2], eau(292, 22) + elephant(450, 292, 0.62) + place(0, 0, 1, `<g>${hyene(150, 352, 0.8)}${miroir(scorpion(60, 352, 0.8), 150)}</g>`) + lievre(340, 296, 0.6, 'anim-saut'))}
    ${et([3], hyene(210, 340, 1.1) + miroir(scorpion(130, 340, 1.2, 'anim-danse'), 300) + bulle(330, 214, '« Appuie sur mon nez ! »'))}
    ${et([4], scorpion(150, 345, 1.1) + miroir(hyene(170, 340, 0.9, 'anim-saut'), 300) + lievre(330, 362, 0.7) + bulle(420, 222, '« Quel fusil ! »'))}`,

  piqueboeuf: () => `${ciel()}${soleil(530, 64, 26)}${sol(300, '#b08a58')}
    ${et([1, 3], place(150, 304, 1, `<path d="M-74 0 Q-60 -52 -8 -56 Q56 -60 78 0Z" fill="#8d8173" stroke="${C.encre}" stroke-width="2.25"/><path d="M-74 0 Q-60 -52 -8 -56 Q56 -60 78 0Z" fill="url(#p-points)" opacity=".3"/>`))}
    ${et([1], piqueBoeuf(150, 226, 1, 'anim-saut') + personne(380, 345, 1.2, { habit: C.indigo, bras: 'avant' }) + bulle(240, 170, '« Piiciti pooco »'))}
    ${et([2], personne(240, 345, 1.2, { habit: C.indigo, cls: 'anim-marche' }) + `<path d="M268 300 Q300 320 330 318" stroke="${C.ocre}" stroke-width="2.25" fill="none"/>` + piqueBoeuf(344, 322, 0.8) + personne(500, 345, 1.1, { habit: C.vert, bras: 'avant' }) + bulle(450, 214, '« Comment ça va ? »'))}
    ${et([3], [[60, 320], [440, 320], [520, 340], [300, 340]].map(([x, y]) => piqueBoeuf(x, y, 0.7, 'anim-danse')).join('') + piqueBoeuf(150, 226, 0.9) + personne(220, 350, 1.1, { habit: C.indigo }))}
    ${et([4], [[120, 140], [230, 90], [340, 150], [430, 80]].map(([x, y]) => piqueBoeuf(x, y, 0.7, 'anim-flotte')).join('') + personne(300, 372, 1, { habit: C.indigo }))}`,

  conteur: () => `${nuit()}${lune(510, 66)}${sol(292)}${arbre(84, 292, 1.2)}
    ${art.feu(300, 346, .75)}${art.humain(190, 350, .85, { geste: 'conte', cls: 'anim-geste' })}
    ${[400, 462, 524].map((x, i) => art.humain(x, 362, .62, { miroir: true, cls: i === 1 ? 'anim-danse' : '' })).join('')}
    ${[400, 524].map((x, i) => `<text class="anim-rire" style="animation-delay:${i * 0.5}s" x="${x}" y="258" font-family="Lexend, system-ui, sans-serif" font-size="17" font-weight="500" fill="#ffe3a1" text-anchor="middle">ha ha</text>`).join('')}`
};

const AMBIANCES = { puits: 'or', yennenga: 'braise', yako: 'sahel', diaba: 'nuit', dafra: 'fleuve', bazoule: 'sahel', loropeni: 'aube', diebougou: 'sahel', diapaga: 'sahel', ziniare: 'or', tiebele: 'or', kango: 'braise', guimbi: 'sahel', bouc: 'braise', corde: 'or', singe: 'aube', marigot: 'sahel', veillee: 'nuit', scorpion: 'braise', piqueboeuf: 'aube', conteur: 'nuit' };
export function illustration(cle, titre = '') {
  const nom = SCENES[cle] ? cle : 'conteur';
  palette = AMBIANCES[nom] ?? 'or';
  const dessin = SCENES[nom]();
  const defs = [palette, 'nuit'].map((p) => art.degrade(`sc-${p}`, art.PALETTES[p])).join('');
  return `<svg viewBox="0 0 600 380" role="img" aria-label="Illustration animée originale : ${titre.replace(/"/g, '')}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs><g class="camera">${dessin}</g></svg>`;
}
export const scenesDisponibles = Object.keys(SCENES);
