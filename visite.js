/* Visite guidée : quelques bulles présentent l'accueil au premier passage.
   Le bouton « ? » de l'en-tête la relance ; Échap ou « Passer » la ferme et elle ne revient plus. */
const CLE = 'voix-visite-vue';
const modePublic = document.documentElement.dataset.public === 'oui';
const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ETAPES = [
  { cible: '#scene', titre: 'La carte en relief', texte: 'Glissez pour faire tourner la carte. Cliquez sur une région : elle se pose à plat et montre ses localités. Chaque feu allumé est un récit.' },
  { cible: '#liste-regions', titre: 'Les 17 régions', texte: 'Vous pouvez aussi choisir une région dans cette liste. Au clavier : Tab pour parcourir, Entrée pour choisir, Échap pour revoir tout le pays.' },
  { cible: '#ecoute', titre: 'Écouter un conte', texte: 'Choisissez mooré, dioula ou fulfulde, puis lancez l’écoute. La phrase entendue s’éclaire ; un clic sur une phrase y amène la voix.' },
  { cible: '.entrer-3d', titre: 'La veillée en 3D', texte: 'Un village la nuit, autour du feu. Choisissez un récit puis marchez librement : la voix vient du feu.' },
  { cible: '.recueil-tete', titre: 'Le recueil', texte: 'Tous les récits, à filtrer par genre ou par langue. Chaque fiche dit d’où vient le récit et ce qu’on en sait.' },
  { cible: '#bouton-aide', titre: 'Besoin d’aide ?', texte: 'Ce bouton relance la visite. Le guide complet détaille les commandes, la 3D et les conseils pour une navigation fluide.', guide: true }
];

let visite = null;
const memoriser = () => { try { localStorage.setItem(CLE, '1'); } catch { /* stockage indisponible : la visite reviendra */ } };
const dejaVue = () => { try { return localStorage.getItem(CLE) === '1'; } catch { return false; } };
const visible = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

export function lancerVisite() {
  fermerVisite(false);
  const etapes = ETAPES.filter((e) => visible(document.querySelector(e.cible)));
  if (!etapes.length) return;
  const halo = document.createElement('div');
  halo.className = 'visite-halo';
  halo.setAttribute('aria-hidden', 'true');
  const bulle = document.createElement('div');
  bulle.className = 'visite-bulle';
  bulle.setAttribute('role', 'dialog');
  bulle.setAttribute('aria-modal', 'true');
  bulle.setAttribute('aria-labelledby', 'visite-titre');
  bulle.setAttribute('aria-describedby', 'visite-texte');
  document.body.append(halo, bulle);
  const retour = document.activeElement;
  const fond = [...document.body.children].filter((el) => el !== halo && el !== bulle && !el.inert);
  for (const el of fond) el.inert = true;
  visite = { etapes, n: 0, halo, bulle, retour, fond };
  bulle.addEventListener('click', (e) => {
    const action = e.target.closest('[data-visite]')?.dataset.visite;
    if (action === 'passer') fermerVisite();
    if (action === 'precedent') montrer(visite.n - 1);
    if (action === 'suivant') visite.n < visite.etapes.length - 1 ? montrer(visite.n + 1) : fermerVisite();
  });
  addEventListener('keydown', clavier, true);
  addEventListener('resize', placer);
  addEventListener('scroll', placer, { passive: true });
  montrer(0);
}

function montrer(n) {
  const { etapes, bulle } = visite;
  visite.n = Math.max(0, Math.min(etapes.length - 1, n));
  const etape = etapes[visite.n];
  const derniere = visite.n === etapes.length - 1;
  bulle.innerHTML = `<p class="visite-compte">Étape ${visite.n + 1} sur ${etapes.length}</p>
    <h2 id="visite-titre">${etape.titre}</h2>
    <p id="visite-texte">${etape.texte}</p>
    ${etape.guide ? `<p><a class="visite-guide" href="${modePublic ? '/guide.html' : '/guide'}">Ouvrir le guide complet</a></p>` : ''}
    <div class="visite-actions">
      <button type="button" class="visite-passer" data-visite="passer">${derniere ? 'Fermer' : 'Passer la visite'}</button>
      <span>
        ${visite.n ? '<button type="button" class="bouton fin" data-visite="precedent">Précédent</button>' : ''}
        <button type="button" class="bouton feu" data-visite="suivant">${derniere ? 'Terminer' : 'Suivant'}</button>
      </span>
    </div>`;
  const cible = document.querySelector(etape.cible);
  cible.scrollIntoView({ behavior: reduit ? 'instant' : 'smooth', block: 'center' });
  bulle.classList.remove('visible');
  const numero = visite.n;
  // La bulle n'apparaît qu'une fois la page immobile : elle ne glisse pas pendant le défilement.
  apresDefilement(() => {
    if (!visite || visite.n !== numero) return;
    placer();
    bulle.classList.add('visible');
    bulle.querySelector('[data-visite="suivant"]').focus({ preventScroll: true });
  });
  placer();
}

function apresDefilement(rappel) {
  if (reduit) { rappel(); return; }
  const debut = performance.now();
  let dernier = null, stable = 0;
  const verifier = () => {
    stable = scrollY === dernier ? stable + 1 : 0;
    dernier = scrollY;
    if (stable >= 4 || performance.now() - debut > 1200) rappel(); else requestAnimationFrame(verifier);
  };
  requestAnimationFrame(verifier);
}

function placer() {
  if (!visite) return;
  const { etapes, n, halo, bulle } = visite;
  const r = document.querySelector(etapes[n].cible)?.getBoundingClientRect();
  if (!r) return;
  const marge = 8, hautEcran = innerHeight, largeEcran = innerWidth;
  const haut = Math.max(marge, r.top - marge), bas = Math.min(hautEcran - marge, r.bottom + marge);
  Object.assign(halo.style, { top: `${haut}px`, left: `${Math.max(marge, r.left - marge)}px`, width: `${Math.min(largeEcran - 2 * marge, r.width + 2 * marge)}px`, height: `${Math.max(0, bas - haut)}px` });
  const b = bulle.getBoundingClientRect();
  // Sous l'élément s'il y a la place, sinon au-dessus, sinon en bas de l'écran.
  let y = bas + 12;
  if (y + b.height > hautEcran - marge) y = haut - b.height - 12;
  if (y < marge) y = hautEcran - b.height - 16;
  const x = Math.min(Math.max(marge, r.left + r.width / 2 - b.width / 2), largeEcran - b.width - marge);
  Object.assign(bulle.style, { top: `${Math.max(marge, y)}px`, left: `${x}px` });
}

function clavier(e) {
  if (!visite) return;
  if (e.key === 'Tab') {
    const commandes = [...visite.bulle.querySelectorAll('a[href], button:not([disabled])')];
    const premier = commandes[0], dernier = commandes.at(-1);
    if (e.shiftKey && (document.activeElement === premier || !visite.bulle.contains(document.activeElement))) {
      e.preventDefault(); dernier.focus();
    } else if (!e.shiftKey && (document.activeElement === dernier || !visite.bulle.contains(document.activeElement))) {
      e.preventDefault(); premier.focus();
    }
    return;
  }
  if (e.key !== 'Escape') return;
  e.stopPropagation(); // Échap ferme la visite sans remettre la carte à zéro.
  fermerVisite();
}

export function fermerVisite(vue = true) {
  if (!visite) return;
  visite.halo.remove(); visite.bulle.remove();
  for (const el of visite.fond) el.inert = false;
  removeEventListener('keydown', clavier, true);
  removeEventListener('resize', placer);
  removeEventListener('scroll', placer);
  const retour = visite.retour;
  visite = null;
  if (vue) memoriser();
  if (vue && retour?.focus) retour.focus({ preventScroll: true });
}

/* Au premier passage, la visite démarre une fois l'écran de chargement parti. « avec-chargement » n'est posée que
   pendant l'animation d'ouverture : en mouvement réduit, le rideau reste masqué dans la page sans être retiré. */
export function visiteAuPremierPassage() {
  if (dejaVue() || location.hash) return;
  const racine = document.documentElement;
  const pret = () => racine.classList.contains('pret') && !racine.classList.contains('avec-chargement');
  const attendre = () => (pret() ? setTimeout(() => { if (!dejaVue()) lancerVisite(); }, 700) : setTimeout(attendre, 250));
  attendre();
}
