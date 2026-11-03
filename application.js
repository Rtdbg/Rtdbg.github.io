import { illustration } from './illustrations.js';
import { creerCarte3D, webglDisponible } from './carte3d.js';

const ns = 'http://www.w3.org/2000/svg';
const $ = (selecteur) => document.querySelector(selecteur);
const esc = (texte) => String(texte ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pluriel = (n, mot, motPluriel = mot + 's') => `${n} ${n > 1 ? motPluriel : mot}`;
const GENRES = { conte: 'Conte', legende: 'Légende', histoire: 'Histoire' };
const modePublic = document.documentElement.dataset.public === 'oui';
const LANGUES = modePublic ? {} : { Mooré: 'marigot-tari', Dioula: 'hyene-et-bouc', Fulfulde: 'yaare-e-fowru' }; // contes disponibles dans la version locale
const ICONES = {
  jouer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5 V19.5 L20 12Z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  relire: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L6 6l6 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/></svg>',
  precedent: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5 V19 L7 12Z"/><path d="M5 5h2v14H5z"/></svg>',
  suivant: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5 V19 L17 12Z"/><path d="M17 5h2v14h-2z"/></svg>',
  voix: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>',
  fleche: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};

const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TEXTE_CARTE = 'Faites tourner la carte et choisissez une région. Chaque feu allumé est un récit.';
const etat = { medias: { photos: [], videos: [] }, regions: [], provinces: [], lieux: new Map(), recits: [], region: null, lieu: null, filtre: 'tous', ecoute: 'Mooré' };
let lecteur = null; // récit en cours de lecture (voir lireRecit)
let voixAccueil = null; // conte joué depuis l'accueil
let carte3d = null; // carte WebGL, si le navigateur la permet

const regionDe = (lieu) => etat.regions.find((r) => r.id === lieu.regionId);
const provinceDe = (lieu) => etat.provinces.find((p) => p.id === lieu.provinceId);
const recitsDe = (lieu) => etat.recits.filter((r) => r.lieuId === lieu.id);
const lieuxDe = (region) => [...etat.lieux.values()].filter((l) => l.regionId === region.id)
  .sort((a, b) => (a.type === b.type ? a.nom.localeCompare(b.nom, 'fr') : a.type === 'chef-lieu' ? -1 : 1));
const recitsDeRegion = (region) => etat.recits.filter((r) => etat.lieux.get(r.lieuId)?.regionId === region.id);
const recitParId = (id) => etat.recits.find((r) => r.id === id);
const lieuNomme = (recit) => { const lieu = etat.lieux.get(recit.lieuId); return `${lieu?.nom}, région ${regionDe(lieu)?.nom}`; };
const duree = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

/* ===================== Carte ===================== */
function dessinerCarte() {
  const formes = $('#formes-regions');
  for (const region of etat.regions) {
    const forme = document.createElementNS(ns, 'path');
    forme.setAttribute('d', region.trace);
    forme.setAttribute('class', 'forme-region');
    forme.setAttribute('tabindex', '0');
    forme.setAttribute('role', 'button');
    forme.setAttribute('aria-label', `Région ${region.nom}`);
    forme.dataset.id = region.id;
    const n = recitsDeRegion(region).length;
    const info = () => { $('#info-carte').textContent = `${region.nom} : ${pluriel(provincesDe(region).length, 'province')}, ${n ? pluriel(n, 'récit') : 'pas encore de récit'}`; };
    forme.addEventListener('mouseenter', info);
    forme.addEventListener('focus', info);
    activer(forme, () => selectionnerRegion(etat.region === region ? null : region));
    formes.append(forme);

    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bouton-region';
    bouton.dataset.id = region.id;
    bouton.setAttribute('aria-label', `${region.nom}, ${n ? pluriel(n, 'récit') : 'pas encore de récit'}`);
    bouton.innerHTML = `<span>${esc(region.nom)}</span>${n ? `<small aria-hidden="true">${n}</small>` : ''}`;
    bouton.addEventListener('click', () => selectionnerRegion(region));
    $('#liste-regions').append(bouton);
  }
  dessinerMarqueurs();
  demarrerCarte3D();
}
function demarrerCarte3D() {
  if (!webglDisponible()) return;
  try {
    carte3d = creerCarte3D($('#scene'), {
      regions: etat.regions.map((r) => ({ ...r, nRecits: recitsDeRegion(r).length })),
      lieux: [...etat.lieux.values()].map((l) => ({ ...l, nRecits: recitsDe(l).length })),
      langueDe: (lieu) => recitsDe(lieu).map((r) => r.audio?.[0]?.langue).filter(Boolean),
      surRegion: (region) => selectionnerRegion(region),
      surSurvol: (region) => { if (!etat.region) $('#info-carte').textContent = region ? `${region.nom} : ${pluriel(provincesDe(region).length, 'province')}, ${recitsDeRegion(region).length ? pluriel(recitsDeRegion(region).length, 'récit') : 'pas encore de récit'}` : TEXTE_CARTE; },
      reduit
    });
    $('#scene').classList.add('en-3d');
    if (!modePublic) carte3d.ecouter(etat.ecoute, recitParId(LANGUES[etat.ecoute]).lieuId);
  } catch (e) { console.warn('Carte 3D indisponible', e); carte3d = null; }
}
const provincesDe = (region) => etat.provinces.filter((p) => p.regionId === region.id);

function activer(element, action) {
  element.addEventListener('click', action);
  element.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } });
}

/* Chaque récit est un feu allumé. Le choix d'une langue laisse brûler les feux de cette langue. */
function dessinerMarqueurs() {
  const groupe = $('#points-lieux');
  groupe.replaceChildren();
  const visibles = etat.region ? lieuxDe(etat.region) : [...etat.lieux.values()];
  const enVoix = recitParId(LANGUES[etat.ecoute])?.lieuId;
  let rang = 0;
  for (const lieu of visibles) {
    const [x, y] = lieu.point;
    const grand = !!etat.region;
    const recits = recitsDe(lieu);
    const doc = recits.length > 0;
    const r = grand ? (doc ? 10 : 7) : (doc ? 6.5 : 2.6);
    const dansLangue = !grand && recits.some((recit) => recit.audio?.[0]?.langue === etat.ecoute);
    const eteint = !modePublic && !grand && doc && !dansLangue;
    const voix = !grand && lieu.id === enVoix;
    if (doc) {
      const halo = document.createElementNS(ns, 'circle');
      halo.setAttribute('cx', x); halo.setAttribute('cy', y); halo.setAttribute('r', r * 2.3);
      halo.setAttribute('class', `feu-halo${eteint ? ' feu-eteint' : ''}${voix ? ' feu-voix' : ''}`);
      halo.style.setProperty('--i', rang);
      groupe.append(halo);
    }
    const marqueur = document.createElementNS(ns, 'circle');
    marqueur.setAttribute('cx', x); marqueur.setAttribute('cy', y); marqueur.setAttribute('r', r);
    marqueur.setAttribute('class', `marqueur${doc ? ' doc' : ''}${etat.lieu?.id === lieu.id ? ' actif' : ''}${eteint ? ' feu-eteint' : ''}${voix ? ' feu-voix' : ''}`);
    marqueur.style.setProperty('--i', rang);
    if (doc) rang++;
    marqueur.setAttribute('tabindex', grand ? '0' : '-1');
    marqueur.setAttribute('role', 'button');
    marqueur.setAttribute('aria-label', `${lieu.nom}, ${doc ? 'récit disponible' : 'pas encore enquêtée'}`);
    const titre = document.createElementNS(ns, 'title');
    titre.textContent = `${lieu.nom}${doc ? ', récit disponible' : ''}`;
    marqueur.append(titre);
    activer(marqueur, () => ouvrirLieu(lieu.id));
    groupe.append(marqueur);
    if (grand) {
      const etiquette = document.createElementNS(ns, 'text');
      etiquette.setAttribute('x', x); etiquette.setAttribute('y', y - 17);
      etiquette.setAttribute('class', 'etiquette-lieu');
      etiquette.textContent = lieu.nom;
      groupe.append(etiquette);
    }
  }
}

function selectionnerRegion(region, { defiler = false } = {}) {
  etat.region = region;
  const scene = $('#scene');
  scene.classList.toggle('aplatie', !!region);
  document.querySelectorAll('.forme-region').forEach((f) => f.classList.toggle('selection', f.dataset.id === region?.id));
  document.querySelectorAll('.bouton-region').forEach((b) => b.classList.toggle('actif', b.dataset.id === region?.id));
  $('#retour-carte').hidden = !region;
  carte3d?.choisir(region);
  if (region) { const b = document.querySelector(`.forme-region[data-id="${region.id}"]`)?.getBBox(); if (b) setTimeout(() => onde(b.x + b.width / 2, b.y + b.height / 2), 120); }
  $('#info-carte').textContent = region ? `${region.nom} : choisissez une localité.` : TEXTE_CARTE;
  $('#scene').querySelector('#points-lieux').classList.remove('pret-feux');
  dessinerMarqueurs();
  afficherHologramme();
  afficherListeLieux();
  if (defiler && region) $('#carte').scrollIntoView({ block: 'start' });
}

function afficherHologramme() {
  const holo = $('#hologramme');
  const region = etat.region;
  if (!region) { holo.hidden = true; holo.dataset.id = ''; return; }
  const lieux = lieuxDe(region);
  const recits = recitsDeRegion(region);
  const nouvelle = holo.dataset.id !== region.id;
  holo.innerHTML = `<span class="balayage"></span>
    <h3>${esc(region.nom)}</h3>
    <p class="chiffres">${pluriel(provincesDe(region).length, 'province')}, ${pluriel(recits.length, 'récit')}</p>
    <ul>${lieux.map((l) => { const n = recitsDe(l).length; return `<li><button type="button" data-id="${l.id}">${esc(l.nom)}<small class="${n ? 'ok' : ''}">${n ? pluriel(n, 'récit') : 'pas encore enquêtée'}</small></button></li>`; }).join('')}</ul>`;
  holo.querySelectorAll('li button').forEach((b) => b.addEventListener('click', () => ouvrirLieu(b.dataset.id)));
  const forme = document.querySelector(`.forme-region[data-id="${region.id}"]`);
  const boite = forme?.getBBox();
  holo.classList.toggle('gauche', !!boite && boite.x + boite.width / 2 > 560);
  holo.hidden = false;
  if (nouvelle) { holo.style.animation = 'none'; void holo.offsetWidth; holo.style.animation = ''; }
  holo.dataset.id = region.id;
}

function afficherListeLieux() {
  const zone = $('#liste-lieux');
  const region = etat.region;
  $('#panneau-lieux').hidden = !region;
  zone.replaceChildren();
  if (!region) return;
  $('#titre-lieux').textContent = region.nom;
  $('#description-lieux').textContent = 'Chefs-lieux et autres localités de la région.';
  for (const lieu of lieuxDe(region)) {
    const n = recitsDe(lieu).length;
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = `lieu${n ? ' doc' : ''}${etat.lieu?.id === lieu.id ? ' actif' : ''}`;
    bouton.dataset.id = lieu.id;
    bouton.innerHTML = `<span><b>${esc(lieu.nom)}</b><small>${lieu.type === 'chef-lieu' ? 'Chef-lieu' : 'Localité'}, province ${esc(provinceDe(lieu)?.nom)}, ${n ? pluriel(n, 'récit') : 'pas encore enquêtée'}</small></span>${ICONES.fleche}`;
    bouton.addEventListener('click', () => ouvrirLieu(lieu.id));
    zone.append(bouton);
  }
}

/* ===================== Écouter dès l'accueil ===================== */
function afficherLangues() {
  if (modePublic) { $('#ecoute').hidden = true; return; }
  const zone = $('#langues');
  zone.innerHTML = Object.keys(LANGUES).map((l) => `<button type="button" data-langue="${l}" aria-pressed="${l === etat.ecoute}">${l}</button>`).join('');
  zone.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => choisirLangue(b.dataset.langue)));
  afficherConteAccueil();
}

function choisirLangue(langue) {
  const continuer = voixAccueil && !voixAccueil.paused;
  etat.ecoute = langue;
  $('#langues').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.langue === langue)));
  if (!etat.region) dessinerMarqueurs();
  afficherConteAccueil();
  const lieu = etat.lieux.get(recitParId(LANGUES[langue]).lieuId);
  if (lieu && !etat.region) onde(...lieu.point);
  carte3d?.ecouter(langue, lieu?.id);
  const carte = $('#ecoute-conte');
  carte.classList.remove('bascule'); void carte.offsetWidth; carte.classList.add('bascule');
  if (continuer) voixAccueil.play().catch(() => {});
}

function afficherConteAccueil() {
  voixAccueil?.pause();
  const recit = recitParId(LANGUES[etat.ecoute]);
  const zone = $('#ecoute-conte');
  zone.innerHTML = `<div class="ecoute-haut"><h2>${esc(recit.titre)}</h2><span class="ecoute-ou">${esc(etat.lieux.get(recit.lieuId)?.nom)}</span></div>
    <p class="ecoute-ligne attente">${esc(recit.resume)}</p>
    ${lecteurVoix(recit.audio[0], recit.titre)}
    <p class="ecoute-bas"><a href="#recit" class="lien-feu" data-entier>Lire le conte en entier, avec sa traduction</a></p>`;
  voixAccueil = zone.querySelector('audio');
  const ligne = zone.querySelector('.ecoute-ligne');
  brancherVoix(zone, (t) => {
    if (!t) return; // tant que la voix n'a pas commencé, on garde le résumé
    const segment = recit.transcription.findLast((s) => s.debut <= t);
    if (!segment) return;
    ligne.classList.remove('attente');
    ligne.lang = recit.codeLangue;
    if (ligne.textContent !== segment.texte) ligne.textContent = segment.texte;
  });
  zone.querySelector('[data-entier]').addEventListener('click', (e) => {
    e.preventDefault();
    voixAccueil.pause();
    ouvrirDepuisRecueil(recit.id);
  });
}

/* ===================== Lecteur de voix ===================== */
const lecteurVoix = (piste, titre) => `<div class="voix">
    <button type="button" class="voix-jouer" aria-label="Écouter ${esc(titre)}">${ICONES.jouer}</button>
    <input class="voix-barre" type="range" min="0" max="1000" value="0" aria-label="Position dans l’enregistrement">
    <span class="voix-temps">0:00</span>
    <audio preload="metadata" src="/audio/${esc(piste.fichier)}"></audio>
  </div>`;

function brancherVoix(racine, surTemps) {
  const bloc = racine.querySelector('.voix');
  if (!bloc) return;
  const audio = bloc.querySelector('audio');
  const jouer = bloc.querySelector('.voix-jouer');
  const barre = bloc.querySelector('.voix-barre');
  const temps = bloc.querySelector('.voix-temps');
  const nom = jouer.getAttribute('aria-label').replace(/^Écouter /, '');
  const majTemps = () => {
    const avance = audio.duration ? audio.currentTime / audio.duration : 0;
    barre.value = String(Math.round(avance * 1000));
    barre.style.setProperty('--avance', `${avance * 100}%`);
    temps.textContent = audio.duration ? `${duree(audio.currentTime)} / ${duree(audio.duration)}` : duree(audio.currentTime);
    surTemps?.(audio.currentTime, avance);
  };
  jouer.addEventListener('click', () => { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
  audio.addEventListener('play', () => { bloc.classList.add('joue'); jouer.innerHTML = ICONES.pause; jouer.setAttribute('aria-label', `Mettre en pause ${nom}`); });
  audio.addEventListener('pause', () => { bloc.classList.remove('joue'); jouer.innerHTML = ICONES.jouer; jouer.setAttribute('aria-label', `Écouter ${nom}`); });
  audio.addEventListener('timeupdate', majTemps);
  audio.addEventListener('seeked', majTemps);
  audio.addEventListener('loadedmetadata', majTemps);
  barre.addEventListener('input', () => { if (audio.duration) audio.currentTime = (Number(barre.value) / 1000) * audio.duration; });
}

/* ===================== Transitions ===================== */
let balayageEnCours = false;
function balayer(action) {
  const voile = $('#balayage-ecran');
  if (reduit || !voile || balayageEnCours) { action(); return; }
  balayageEnCours = true;
  voile.classList.remove('sort');
  voile.classList.add('entre');
  setTimeout(() => {
    action();
    voile.classList.remove('entre');
    voile.classList.add('sort');
    setTimeout(() => { voile.classList.remove('sort'); balayageEnCours = false; }, 720);
  }, 560);
}
const allerA = (selecteur) => $(selecteur).scrollIntoView({ behavior: 'instant', block: 'start' });

/* Une onde part d'un point de la carte. */
function onde(x, y) {
  if (reduit) return;
  const c = document.createElementNS(ns, 'circle');
  c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 16); c.setAttribute('class', 'onde-carte');
  $('#points-lieux').append(c);
  setTimeout(() => c.remove(), 1300);
}
function decouperMots(el) {
  if (el.dataset.decoupe === el.textContent) return;
  const mots = el.textContent.trim().split(/\s+/);
  el.innerHTML = mots.map((m, i) => `<span class="mot"><span style="--i:${i}">${esc(m)}</span></span>`).join(' ');
  el.dataset.decoupe = el.textContent;
}
function rejouerTitre(el) {
  decouperMots(el);
  el.classList.remove('vu'); void el.offsetWidth; el.classList.add('vu');
}

/* ===================== Lieux et récits ===================== */
function montrerLecture() { $('#recit').hidden = false; voixAccueil?.pause(); }
function presenterTitre() { rejouerTitre($('#titre-recit')); observerApparitions(); }

function ouvrirLieu(id, { defiler = true } = {}) {
  const lieu = etat.lieux.get(id);
  if (!lieu) return;
  etat.lieu = lieu;
  if (etat.region?.id !== lieu.regionId) selectionnerRegion(regionDe(lieu));
  else { dessinerMarqueurs(); afficherListeLieux(); }
  const recits = recitsDe(lieu);
  const ouvrir = () => {
    if (recits.length === 1) lireRecit(recits[0]);
    else if (recits.length > 1) afficherChoix(lieu, recits);
    else afficherLieuVide(lieu);
    if (defiler) allerA('#recit');
  };
  if (defiler) balayer(ouvrir); else ouvrir();
}

function arreterLecture() {
  if (lecteur) { lecteur.arreter(); lecteur = null; }
}

function afficherLieuVide(lieu) {
  arreterLecture();
  montrerLecture();
  $('#titre-recit').textContent = lieu.nom;
  presenterTitre();
  const zone = $('#zone-recit');
  zone.innerHTML = `<div class="avis-vide">
    <p class="discret">${lieu.type === 'chef-lieu' ? 'Chef-lieu de la province' : 'Localité de la province'} ${esc(provinceDe(lieu)?.nom)}, région ${esc(regionDe(lieu)?.nom)}</p>
    <p>${modePublic ? 'Nos équipes n’ont pas encore enquêté sur cette localité.' : 'Nos équipes n’ont pas encore enquêté sur cette localité, mais si vous avez des données pour nous, veuillez nous contacter <a href="#contribuer" id="lien-ici">ici</a>.'}</p></div>`;
  if (!modePublic) $('#lien-ici').addEventListener('click', (e) => { e.preventDefault(); preparerContribution(lieu.id); });
}

function afficherChoix(lieu, recits) {
  arreterLecture();
  montrerLecture();
  $('#titre-recit').textContent = `${lieu.nom} : ${pluriel(recits.length, 'récit')}`;
  presenterTitre();
  const zone = $('#zone-recit');
  zone.innerHTML = `<div class="choix-recits">${recits.map(carteRecit).join('')}</div>`;
  zone.querySelectorAll('.carte-recit').forEach((c) => c.addEventListener('click', () => balayer(() => { lireRecit(recitParId(c.dataset.id)); allerA('#recit'); })));
  brancherCouvertures(zone);
  observerApparitions();
}

const imageCouverture = (recit) => (recit.photo ? `/images/${recit.photo.fichier}` : `/couvertures/${recit.id}.svg`);
function carteRecit(recit) {
  const lieu = etat.lieux.get(recit.lieuId);
  const langue = recit.audio?.[0]?.langue;
  return `<button type="button" class="carte-recit revele" data-id="${recit.id}">
    <span class="couverture${recit.photo ? ' photo' : ''}"><img src="${imageCouverture(recit)}" alt="" loading="lazy">
      <span class="couverture-titre"><small>${GENRES[recit.genre]}${langue ? ` en ${esc(langue.toLowerCase())}` : ''}</small><strong>${esc(recit.titre)}</strong></span>
      <span class="couverture-reflet"></span></span>
    <span class="corps"><span class="ou">${esc(lieu?.nom)}, région ${esc(regionDe(lieu)?.nom)}</span><span class="resume">${esc(recit.resume)}</span></span></button>`;
}

/* Changement de plan : un coup de pinceau d'or balaie l'image et la caméra repart. */
function changerEtape(figure, etape) {
  const valeur = String(etape);
  if (figure.dataset.etape === valeur) return;
  figure.dataset.etape = valeur;
  const camera = figure.querySelector('.camera');
  if (camera) camera.style.setProperty('--foyer', ['50% 60%', '30% 70%', '70% 55%', '50% 65%'][etape - 1]);
  figure.classList.remove('coupe'); void figure.offsetWidth; figure.classList.add('coupe');
}

/* La voix mène le récit : la phrase entendue s'éclaire et l'illustration avance avec l'enregistrement (écoute via timeupdate). */
function suivreTranscription(zone, figure) {
  const cadre = zone.querySelector('.transcription');
  const lignes = cadre ? [...cadre.querySelectorAll('.ligne')] : [];
  const audio = zone.querySelector('audio');
  let active = -1;
  brancherVoix(zone, (t, avance) => {
    if (avance) changerEtape(figure, Math.min(4, Math.floor(avance * 4) + 1));
    if (!cadre) return;
    const i = lignes.findLastIndex((l) => Number(l.dataset.debut) <= t);
    if (i === active) return;
    lignes.forEach((l, n) => { l.classList.toggle('passee', n < i); l.classList.toggle('active', n === i); });
    active = i;
    if (i >= 0) cadre.scrollTop = lignes[i].offsetTop - cadre.clientHeight / 3;
  });
  cadre?.addEventListener('click', (e) => {
    const ligne = e.target.closest('.ligne');
    if (!ligne) return;
    audio.currentTime = Number(ligne.dataset.debut);
    audio.play().catch(() => {});
  });
}

function lireRecit(recit, { defiler = false } = {}) {
  arreterLecture();
  montrerLecture();
  const lieu = etat.lieux.get(recit.lieuId);
  $('#titre-recit').textContent = recit.titre;
  const etapes = recit.etapes.length ? recit.etapes : [recit.resume];
  const audioSeul = recit.etapes.length === 0;
  const zone = $('#zone-recit');
  const langueRecit = recit.langue === 'Français' ? '' : ` en ${esc(recit.langue.toLowerCase())}`;
  zone.innerHTML = `<article class="fiche-recit">
    <div class="colonne-visuels${recit.film || recit.photo ? ' plusieurs' : ''}">
      <figure class="illustration" data-etape="0"><div class="dessin"></div><figcaption>Scène animée créée pour le projet. Elle avance avec le récit.</figcaption></figure>
      ${recit.film ? `<figure class="film revele"><video controls preload="none" playsinline poster="/images/film-${recit.id}.jpg" src="/films/${esc(recit.film)}" aria-label="Film du conte ${esc(recit.titre)}"></video><figcaption><b>Le film du conte.</b> Images réelles d’archives libres, filmées ailleurs que dans ce conte, montées sur la voix et le texte d’origine.</figcaption></figure>` : ''}
      ${recit.photo ? `<figure class="photo-recit revele"><img src="/images/${esc(recit.photo.fichier)}" alt="${esc(recit.photo.legende)}" loading="lazy"><figcaption><b>${esc(recit.photo.legende)}.</b> Photo de ${esc(recit.photo.auteur)}, <a href="${esc(recit.photo.url)}" target="_blank" rel="noopener noreferrer">${esc(recit.photo.licence)}</a>.</figcaption></figure>` : ''}
    </div>
    <div class="texte-recit cascade">
      ${recit.transcription?.length ? `<a class="bouton feu aimant entrer-3d" href="/immersion?recit=${recit.id}" data-page>Vivre ce conte dans la veillée en 3D</a>` : ''}
      <p class="meta">${GENRES[recit.genre]}${langueRecit}${recit.peuple && recit.peuple !== recit.langue ? `, ${esc(recit.peuple)}` : ''}</p>
      <p class="lieu-recit">${esc(lieu?.nom)}, province ${esc(provinceDe(lieu)?.nom)}, région ${esc(regionDe(lieu)?.nom)}</p>
      ${recit.titreOriginal && recit.titreOriginal !== recit.titre ? `<p class="titre-original" lang="${esc(recit.codeLangue)}">${esc(recit.titreOriginal)}</p>` : ''}
      <p class="passage${audioSeul ? ' court' : ''}" aria-live="polite"></p>
      ${audioSeul ? '' : `<div class="progression" role="group" aria-label="Passages du récit">${etapes.map((_, i) => `<button type="button" aria-label="Aller au passage ${i + 1}"></button>`).join('')}</div>
      <div class="commandes">
        <button type="button" class="commande principale" data-action="pause"></button>
        <button type="button" class="commande" data-action="precedent">${ICONES.precedent}Précédent</button>
        <button type="button" class="commande" data-action="suivant">${ICONES.suivant}Suivant</button>
        <button type="button" class="commande" data-action="voix" aria-pressed="false">${ICONES.voix}Écouter en français</button>
        <span class="etape-num"></span>
      </div><p class="erreur-voix" role="alert" hidden></p>`}
      ${recit.audio?.length ? `<div class="bloc"><h3>Écouter en ${esc(recit.audio[0].langue.toLowerCase())}</h3>
        ${lecteurVoix(recit.audio[0], recit.titre)}
        <p class="voix-auteur">Voix : ${esc(recit.audio[0].auteur)}${recit.audio[0].source ? `. <a href="${esc(recit.audio[0].source)}" target="_blank" rel="noopener noreferrer">Écouter à la source</a>` : ''}</p></div>` : ''}
      ${recit.transcription?.length ? `<div class="bloc"><h3>Le texte suit la voix</h3>
        <p class="discret">Lancez l’écoute : la phrase entendue s’éclaire. Cliquez sur une phrase pour y aller.</p>
        <div class="transcription" lang="${esc(recit.codeLangue)}">${recit.transcription.map((s) => `<span class="ligne" data-debut="${s.debut}">${esc(s.texte)}</span>`).join(' ')}</div></div>` : ''}
      ${recit.traduction?.length ? `<details class="bloc traduction"><summary>Lire la traduction française</summary>
        ${recit.traductionDeTravail ? '<p class="avis-travail">Traduction de travail faite par notre groupe à l’aide d’un dictionnaire, à faire relire par une personne qui parle la langue.</p>' : ''}
        <div class="ecoute-fr"><p class="discret">Écouter en français. ${recit.traductionHumaine ? `Voix : ${esc(recit.traductionHumaine)}.` : 'Voix de synthèse, ce n’est pas un vrai conteur.'}</p>${lecteurVoix({ fichier: `fr-${recit.traductionHumaine ? 'voix-' : ''}${recit.id}.mp3` }, `la traduction française de ${recit.titre}`)}</div>
        ${recit.traduction.map((p) => `<p>${esc(p)}</p>`).join('')}</details>` : ''}
      ${!audioSeul ? `<p class="discret bloc">${recit.voixFrHumaine ? `Voix française : ${esc(recit.voixFrHumaine)}.` : 'Voix de synthèse française, générée pour ce projet : ce n’est pas un vrai conteur.'}</p>` : ''}
      ${recit.mots?.length ? `<div class="bloc"><h3>Mots du récit</h3><div class="mots">${recit.mots.map((m) => `<details><summary>${esc(m.mot)}</summary>${esc(m.sens)}</details>`).join('')}</div></div>` : ''}
      <div class="bloc"><h3>D’où vient ce récit</h3><p>${esc(recit.statutEditorial)}</p>
        <ul class="sources-recit">${recit.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.titre)}</a>` : esc(s.titre)}, ${esc(s.auteur)}</li>`).join('')}</ul></div>
    </div></article>`;

  const figure = zone.querySelector('.illustration');
  const dessin = zone.querySelector('.dessin');
  const passage = zone.querySelector('.passage');
  const barres = [...zone.querySelectorAll('.progression button')];
  const bouton = (action) => zone.querySelector(`[data-action="${action}"]`);
  const voixFr = new Audio();
  voixFr.preload = 'none';
  let etape = 0, enLecture = !audioSeul, voix = false, minuteur = null, debut = 0, delai = 0, image = null, termine = false, audioEnPause = false, tempsRestant = null;
  const etiquette = (icone, texte) => { if (bouton('pause')) bouton('pause').innerHTML = `${ICONES[icone]}${texte}`; };

  const dureeDe = (texte) => Math.max(7000, texte.split(/\s+/).length * 330 + 2500);
  function afficher() {
    changerEtape(figure, audioSeul ? 1 : Math.min(etape + 1, 4));
    if (!dessin.firstChild) dessin.innerHTML = illustration(recit.illustration, recit.titre);
    passage.textContent = etapes[etape];
    passage.style.animation = 'none'; void passage.offsetWidth; passage.style.animation = '';
    if (audioSeul) return;
    barres.forEach((b, i) => { b.className = i < etape ? 'fait' : i === etape ? 'encours' : ''; b.style.removeProperty('--avance'); });
    bouton('precedent').disabled = etape === 0;
    bouton('suivant').disabled = etape === etapes.length - 1;
    zone.querySelector('.etape-num').textContent = `Passage ${etape + 1} sur ${etapes.length}`;
  }
  function suivreAvance() {
    cancelAnimationFrame(image);
    const barre = barres[etape];
    const tick = () => {
      if (!enLecture || voix || !barre) return;
      barre.style.setProperty('--avance', Math.min(100, ((performance.now() - debut) / delai) * 100) + '%');
      image = requestAnimationFrame(tick);
    };
    image = requestAnimationFrame(tick);
  }
  function programmer(repriseRestante = null) {
    clearTimeout(minuteur); cancelAnimationFrame(image);
    if (!enLecture || audioSeul) return;
    if (voix) { parler(); return; }
    delai = dureeDe(etapes[etape]);
    const restant = repriseRestante === null ? delai : Math.max(1, repriseRestante);
    debut = performance.now() - (delai - restant);
    suivreAvance();
    minuteur = setTimeout(() => { if (etape < etapes.length - 1) { etape++; afficher(); programmer(); } else terminer(); }, restant);
  }
  function echecVoix(erreur) {
    if (erreur?.name === 'AbortError' || !voix || lecteur?.id !== recit.id) return;
    voix = false; audioEnPause = false;
    voixFr.pause(); voixFr.onended = null; voixFr.onerror = null;
    bouton('voix').setAttribute('aria-pressed', 'false');
    const message = zone.querySelector('.erreur-voix');
    message.textContent = 'La lecture audio est indisponible. Le récit continue sans son.';
    message.hidden = false;
    if (enLecture) programmer();
  }
  function parler() {
    audioEnPause = false;
    voixFr.pause();
    voixFr.src = `/audio/fr-${recit.voixFrHumaine ? 'voix-' : ''}${recit.id}-${etape + 1}.mp3`;
    // Le passage suivant n'arrive qu'à la fin de la piste : la voix n'est plus coupée.
    voixFr.onended = () => { if (!voix || !enLecture || lecteur?.id !== recit.id) return; if (etape < etapes.length - 1) { etape++; afficher(); parler(); } else { voix = false; bouton('voix').setAttribute('aria-pressed', 'false'); terminer(); } };
    voixFr.onerror = echecVoix;
    voixFr.play().catch(echecVoix);
  }
  function terminer() {
    enLecture = false; termine = true; clearTimeout(minuteur); cancelAnimationFrame(image);
    barres.forEach((b) => { b.className = 'fait'; });
    etiquette('relire', 'Relire');
  }
  function mettreEnPause() {
    audioEnPause = voix && Boolean(voixFr.src);
    tempsRestant = !voix && !audioSeul ? Math.max(1, delai - (performance.now() - debut)) : null;
    enLecture = false; clearTimeout(minuteur); cancelAnimationFrame(image);
    voixFr.pause();
    etiquette('jouer', 'Reprendre');
  }
  function reprendre() {
    enLecture = true; termine = false;
    etiquette('pause', 'Pause');
    const restant = tempsRestant; tempsRestant = null;
    if (voix && audioEnPause) { audioEnPause = false; voixFr.play().catch(() => {}); }
    else programmer(restant);
  }
  function aller(n) { // un saut manuel remet le minuteur à zéro
    audioEnPause = false; tempsRestant = null;
    etape = Math.max(0, Math.min(etapes.length - 1, n));
    afficher();
    voixFr.pause();
    if (enLecture) programmer();
  }

  if (!audioSeul) {
    etiquette('pause', 'Pause');
    bouton('pause').addEventListener('click', () => {
      if (termine) { etape = 0; afficher(); reprendre(); }
      else if (enLecture) mettreEnPause(); else reprendre();
    });
    bouton('precedent').addEventListener('click', () => aller(etape - 1));
    bouton('suivant').addEventListener('click', () => aller(etape + 1));
    barres.forEach((b, i) => b.addEventListener('click', () => aller(i)));
    bouton('voix')?.addEventListener('click', (e) => {
      voix = !voix;
      audioEnPause = false; tempsRestant = null;
      zone.querySelector('.erreur-voix').hidden = true;
      e.currentTarget.setAttribute('aria-pressed', String(voix));
      voixFr.pause();
      if (voix && !enLecture) { enLecture = true; termine = false; etiquette('pause', 'Pause'); }
      programmer();
    });
  }
  suivreTranscription(zone, figure);
  // Un seul son à la fois : la voix et le film s'arrêtent l'un l'autre.
  zone.addEventListener('play', (e) => { zone.querySelectorAll('audio,video').forEach((m) => { if (m !== e.target) m.pause(); }); if (e.target.tagName === 'VIDEO' && enLecture) mettreEnPause(); }, true);
  const traductionFr = zone.querySelector('.ecoute-fr');
  if (traductionFr) brancherVoix(traductionFr);
  presenterTitre();
  zone.querySelector('.entrer-3d')?.addEventListener('click', (e) => { e.preventDefault(); const href = e.currentTarget.getAttribute('href'); balayer(() => { location.href = href; }); });
  lecteur = { id: recit.id, arreter: () => { enLecture = false; voix = false; clearTimeout(minuteur); cancelAnimationFrame(image); voixFr.pause(); zone.querySelectorAll('audio,video').forEach((a) => a.pause()); } };
  afficher();
  programmer();
  if (defiler) allerA('#recit');
}

/* ===================== Recueil ===================== */
function afficherRecueil() {
  const langues = [...new Set(etat.recits.flatMap((r) => r.audio.map((a) => a.langue)))];
  const filtres = [['tous', 'Tous'], ['conte', 'Contes'], ['legende', 'Légendes'], ['histoire', 'Histoire'], ...langues.map((l) => [l, `En ${l.toLowerCase()}`])];
  $('#filtres').innerHTML = filtres.map(([cle, nom]) => `<button type="button" class="filtre" data-filtre="${cle}" aria-pressed="${etat.filtre === cle}">${nom}</button>`).join('');
  $('#filtres').querySelectorAll('.filtre').forEach((b) => b.addEventListener('click', () => { etat.filtre = b.dataset.filtre; afficherRecueil(); }));
  const liste = etat.recits.filter((r) => etat.filtre === 'tous' || r.genre === etat.filtre || r.audio?.[0]?.langue === etat.filtre);
  const zone = $('#cartes-recits');
  zone.innerHTML = liste.map(carteRecit).join('');
  zone.querySelectorAll('.carte-recit').forEach((c, i) => { c.style.setProperty('--r', `${[-2.2, 1.6, -1.2, 2][i % 4]}deg`); c.style.setProperty('--decale', `${(i % 4) * 70}ms`); c.addEventListener('click', () => ouvrirDepuisRecueil(c.dataset.id)); });
  brancherCouvertures(zone);
  observerApparitions();
}
function ouvrirDepuisRecueil(id) {
  const recit = recitParId(id);
  const lieu = etat.lieux.get(recit.lieuId);
  balayer(() => {
    etat.lieu = lieu;
    selectionnerRegion(regionDe(lieu));
    lireRecit(recit, { defiler: true });
  });
}
function afficherParcours() {
  document.querySelectorAll('button[data-recit]').forEach((b) => b.addEventListener('click', () => ouvrirDepuisRecueil(b.dataset.recit)));
}

/* ===================== Contribution ===================== */
function construireFormulaire() {
  const regionsTriees = [...etat.regions].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const options = regionsTriees.map((r) => `<optgroup label="${esc(r.nom)}">${lieuxDe(r).map((l) => `<option value="${l.id}">${esc(l.nom)} (province ${esc(provinceDe(l)?.nom)})</option>`).join('')}</optgroup>`).join('');
  $('#formulaire-zone').innerHTML = `<form id="formulaire" novalidate>
    <label>Localité concernée<select name="lieuId" required><option value="">Choisir une localité…</option>${options}<option value="autre">Autre localité (à préciser dans le message)</option></select></label>
    <label>Votre nom<input name="nom" required minlength="2" maxlength="120" autocomplete="name"></label>
    <label>Votre adresse courriel<input name="email" type="email" required maxlength="200" autocomplete="email"></label>
    <label>Votre message : récit, conteur à rencontrer, version d’une légende…<textarea name="message" required minlength="10" maxlength="4000"></textarea></label>
    <label>Média facultatif : image, audio ou vidéo, 8 Mo maximum
      <input name="media" type="file" accept="image/png,image/jpeg,image/webp,audio/mpeg,audio/ogg,audio/wav,audio/mp4,.m4a,video/mp4,video/webm"></label>
    <label class="piege" aria-hidden="true">Laisser vide<input name="site" tabindex="-1" autocomplete="off"></label>
    <label class="consentement"><input type="checkbox" name="consentement" value="oui" required>
      <span>J’accepte que ce message soit conservé pour examen. Je possède les droits sur le média joint, ou l’accord de la personne enregistrée ou photographiée. Rien ne sera publié automatiquement.</span></label>
    <div><button type="submit" class="bouton plein">Envoyer la contribution</button></div>
    <p class="statut" role="status" aria-live="polite"></p>
  </form>`;
  const form = $('#formulaire');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const statut = form.querySelector('.statut');
    const dire = (texte, ok) => { statut.textContent = texte; statut.className = `statut ${ok ? 'succes' : 'erreur'}`; };
    if (!form.checkValidity()) { dire('Merci de choisir une localité, d’indiquer votre nom, un courriel valide, un message d’au moins 10 caractères et de cocher l’accord.', false); form.reportValidity(); return; }
    const media = form.media.files[0];
    if (media && media.size > 8 * 1024 * 1024) { dire('Le média dépasse 8 Mo : réduisez-le ou envoyez un extrait.', false); return; }
    const envoyer = form.querySelector('[type="submit"]');
    envoyer.disabled = true; dire('Envoi en cours…', true);
    try {
      const reponse = await fetch('/api/contributions', { method: 'POST', body: new FormData(form) });
      const resultat = await reponse.json().catch(() => ({}));
      if (reponse.ok) {
        dire(`Merci, votre message a bien été enregistré (référence ${resultat.id}). Nous le lirons avant toute utilisation.`, true);
        const lieu = form.lieuId.value; form.reset(); form.lieuId.value = lieu;
      } else dire(resultat.erreur ?? 'La contribution n’a pas pu être enregistrée.', false);
    } catch { dire('Le serveur ne répond pas. Réessayez plus tard.', false); }
    finally { envoyer.disabled = false; }
  });
}

function preparerContribution(lieuId) {
  const select = $('#formulaire select[name="lieuId"]');
  if (select) select.value = lieuId || '';
  const lieu = etat.lieux.get(lieuId);
  $('#titre-contribution').textContent = lieu ? `Partager une mémoire de ${lieu.nom}` : 'Partager une mémoire';
  $('#contribuer').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => $('#formulaire input[name="nom"]')?.focus({ preventScroll: true }), 600);
}

/* ===================== Mise en scène ===================== */
function jouerChargement() {
  const racine = document.documentElement;
  const chargement = $('.chargement');
  if (!racine.classList.contains('avec-chargement')) { racine.classList.add('pret'); return; }
  const compteur = $('#chargement-compteur');
  const mot = $('#chargement-mot');
  const nom = $('.chargement-nom');
  const mots = Object.keys(LANGUES);
  const debut = performance.now();
  const duree = 1000;
  const tick = (maintenant) => {
    const p = Math.min(1, (maintenant - debut) / duree);
    nom.style.setProperty('--rempli', `${p * 100}%`);
    compteur.textContent = String(Math.round(p * 100)).padStart(3, '0');
    mot.textContent = mots[Math.min(mots.length - 1, Math.floor(p * mots.length))] ?? 'Faso';
    if (p < 1) { requestAnimationFrame(tick); return; }
    chargement.classList.add('part');
    setTimeout(() => racine.classList.add('pret'), 260);
    setTimeout(() => { chargement.remove(); racine.classList.remove('avec-chargement'); }, 1150);
  };
  requestAnimationFrame(tick);
}

/* Apparitions au défilement : une seule fois, et rien si le visiteur demande moins de mouvement. */
let observateur = null;
function observerApparitions() {
  if (reduit) return;
  observateur ??= new IntersectionObserver((entrees) => {
    for (const e of entrees) if (e.isIntersecting) { e.target.classList.add('vu'); observateur.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  document.querySelectorAll('.revele:not(.vu), [data-mots]:not(.vu)').forEach((el) => observateur.observe(el));
}

/* Couverture : elle se redresse et suit le pointeur. */
function brancherCouvertures(racine) {
  if (reduit || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  racine.querySelectorAll('.carte-recit').forEach((c) => {
    const couv = c.querySelector('.couverture');
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      couv.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 12}deg) translateZ(14px)`;
      couv.style.setProperty('--rx', `${(x + 0.5) * 100}%`); couv.style.setProperty('--ry', `${(y + 0.5) * 100}%`);
    });
    c.addEventListener('pointerleave', () => { couv.style.transform = ''; });
  });
}

/* Braises qui montent d'un feu invisible. */
function braises(canvas) {
  if (reduit) { canvas.remove(); return; }
  const ctx = canvas.getContext('2d');
  let parts = [], l = 0, h = 0, visible = true;
  const taille = () => {
    const d = Math.min(devicePixelRatio, 1.5);
    l = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = l * d; canvas.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    parts = Array.from({ length: Math.min(70, Math.round(l / 18)) }, () => nouvelle(true));
  };
  const nouvelle = (partout) => ({ x: Math.random() * l, y: partout ? Math.random() * h : h + 10, r: 0.6 + Math.random() * 2.1, v: 0.25 + Math.random() * 0.9, o: Math.random() * 6.28, a: 0.35 + Math.random() * 0.6, c: Math.random() > 0.6 ? '238,180,79' : '217,103,47' });
  addEventListener('resize', taille);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  taille();
  const tour = () => {
    if (visible) {
      ctx.clearRect(0, 0, l, h);
      for (const p of parts) {
        p.y -= p.v; p.o += 0.02; p.x += Math.sin(p.o) * 0.45;
        if (p.y < -10) Object.assign(p, nouvelle(false));
        const f = Math.max(0, Math.min(1, p.y / h));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29);
        ctx.fillStyle = `rgba(${p.c},${p.a * f})`;
        ctx.shadowBlur = 10; ctx.shadowColor = `rgba(${p.c},.9)`;
        ctx.fill();
      }
    }
    requestAnimationFrame(tour);
  };
  tour();
}

function afficherLieuxEtMouvement() {
  const items = [...etat.recits.filter((r) => r.photo).map((r) => ({ ...r.photo, recit: r.id, titre: r.titre })), ...etat.medias.photos];
  $('#lieux-rail').innerHTML = items.map((p, i) => `<figure class="lieu-photo" style="--i:${i}">${p.recit ? `<button type="button" data-recit-photo="${p.recit}" aria-label="Ouvrir le récit ${esc(p.titre)}">` : '<span>'}
      <img src="/images/${esc(p.fichier)}" alt="${esc(p.legende)}" loading="lazy">${p.recit ? '</button>' : '</span>'}
      <figcaption><b>${esc(p.legende)}</b><small>Photo de ${esc(p.auteur)}, ${esc(p.licence)}</small></figcaption></figure>`).join('');
  $('#lieux-rail').querySelectorAll('[data-recit-photo]').forEach((b) => b.addEventListener('click', () => ouvrirDepuisRecueil(b.dataset.recitPhoto)));
  $('#mouvement-videos').innerHTML = etat.medias.videos.map((v) => `<figure class="video-danse revele"><video controls preload="metadata" playsinline src="/video/${esc(v.fichier)}" aria-label="${esc(v.legende)}"></video>
      <figcaption><b>${esc(v.legende)}.</b> Vidéo de ${esc(v.auteur)}, <a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${esc(v.licence)}</a>.</figcaption></figure>`).join('');
}

function miseEnScene() {
  document.querySelectorAll('h1 .mot').forEach((m, i) => m.firstElementChild.style.setProperty('--i', i));
  document.querySelectorAll('.forme-region').forEach((f, i) => f.style.setProperty('--i', i));
  document.querySelectorAll('[data-mots]').forEach(decouperMots);
  $('#points-lieux').classList.add('pret-feux');
  jouerChargement();
  document.querySelectorAll('.braises').forEach(braises);
  observerApparitions();
  brancherCouvertures(document);

  const entete = $('#entete');
  const hautPage = $('#haut-page');
  const barre = $('#barre-defilement');
  const citation = $('#citation-texte');
  const mots = citation.textContent.split(' ');
  citation.setAttribute('aria-label', citation.textContent);
  citation.innerHTML = mots.map((m) => `<span aria-hidden="true">${esc(m)}</span>`).join(' ');
  const motsCitation = [...citation.children];
  const grand = () => innerWidth > 1000 && !reduit;

  const voyage = $('#voyage'), voyageImages = [...document.querySelectorAll('.voyage-images img')], voyageEtapes = [...document.querySelectorAll('#voyage-etapes li')];
  const lieux = $('#lieux'), rail = $('#lieux-rail');
  const mouvement = $('#mouvement'), fond = $('.mouvement-fond');
  const filigrane = $('.filigrane');
  const borne = (x) => Math.max(0, Math.min(1, x));
  const ajusterRail = () => { lieux.style.height = grand() ? `${innerHeight + Math.max(0, rail.scrollWidth - innerWidth + 120)}px` : ''; };
  addEventListener('resize', ajusterRail); ajusterRail();
  rail.querySelectorAll('img').forEach((i) => i.addEventListener('load', ajusterRail));

  let attente = false;
  const defilement = () => {
    attente = false;
    const vh = innerHeight;
    entete.classList.toggle('defile', scrollY > 24);
    hautPage.classList.toggle('visible', scrollY > vh * 1.2);
    const max = document.documentElement.scrollHeight - vh;
    barre.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    if (reduit) return;
    // La phrase s'allume mot à mot.
    const c = citation.getBoundingClientRect();
    const p = borne((vh * 0.9 - c.top) / (c.height + vh * 0.35));
    motsCitation.forEach((m, i) => { m.style.opacity = Math.max(0.14, Math.min(1, (p * (mots.length + 4) - i) / 4)); });
    if (filigrane) filigrane.style.transform = `translateX(${-scrollY * 0.35}px)`;
    if (!grand()) { rail.style.transform = ''; fond.style.clipPath = ''; voyageImages.forEach((i) => { i.style.clipPath = ''; i.style.transform = ''; }); return; }
    // Le voyage : chaque couverture remonte en volet sur la précédente.
    const rv = voyage.getBoundingClientRect();
    const pv = borne(-rv.top / (rv.height - vh)) * voyageImages.length;
    voyageImages.forEach((img, i) => {
      const local = borne(pv - i + 0.5);
      img.style.clipPath = i === 0 ? 'none' : `inset(${(1 - local) * 100}% 0 0 0 round 18px)`;
      img.style.transform = `scale(${1.14 - borne(pv - i + 0.5) * 0.14})`;
    });
    const actif = Math.min(voyageImages.length - 1, Math.floor(pv));
    voyageEtapes.forEach((li, i) => { li.classList.toggle('actif', i === actif); li.classList.toggle('passe', i < actif); });
    // Le rail de photos glisse à l'horizontale.
    const rl = lieux.getBoundingClientRect();
    const dist = rl.height - vh;
    if (dist > 0) {
      const pl = borne(-rl.top / dist);
      rail.style.transform = `translateX(${-pl * dist}px)`;
      rail.querySelectorAll('img').forEach((img) => { const r = img.parentElement.getBoundingClientRect(); img.style.transform = `translateX(${((r.left + r.width / 2) / innerWidth - 0.5) * -46}px) scale(1.18)`; });
    }
    // La danse s'ouvre jusqu'au plein écran.
    const rm = mouvement.getBoundingClientRect();
    const pm = borne((vh - rm.top) / (vh * 0.9));
    fond.style.clipPath = `inset(${(1 - pm) * 14}% ${(1 - pm) * 16}% ${(1 - pm) * 14}% ${(1 - pm) * 16}% round ${(1 - pm) * 28}px)`;
  };
  addEventListener('scroll', () => { if (!attente) { attente = true; requestAnimationFrame(defilement); } }, { passive: true });
  addEventListener('resize', defilement);
  defilement();

  // La vidéo de fond ne joue que lorsqu'elle est visible.
  const videoFond = $('[data-fond]');
  if (reduit) videoFond.removeAttribute('loop');
  else new IntersectionObserver(([e]) => { if (e.isIntersecting) videoFond.play().catch(() => {}); else videoFond.pause(); }).observe(videoFond);

  // Parallaxe : la carte et la lueur suivent le pointeur, avec inertie.
  if (!reduit && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const veillee = $('.veillee'), lueur = $('.lueur'), scene = $('#scene');
    let cx = 0, cy = 0, x = 0, y = 0, sx = 0, sy = 0, enCours = false;
    const anime = () => {
      x += (cx - x) * 0.07; y += (cy - y) * 0.07;
      scene.style.transform = `translate3d(${x * -22}px,${y * -16}px,0) rotateY(${x * 5}deg) rotateX(${y * -4}deg)`;
      lueur.style.transform = `translate3d(${sx - 300}px,${sy - 300}px,0)`;
      if (Math.abs(cx - x) + Math.abs(cy - y) > 0.002) requestAnimationFrame(anime); else enCours = false;
    };
    veillee.addEventListener('pointermove', (e) => {
      const r = veillee.getBoundingClientRect();
      cx = (e.clientX - r.left) / r.width - 0.5; cy = (e.clientY - r.top) / r.height - 0.5;
      sx = e.clientX - r.left; sy = e.clientY - r.top;
      if (!enCours) { enCours = true; requestAnimationFrame(anime); }
    });
    // Boutons aimantés.
    document.addEventListener('pointermove', (e) => {
      const b = e.target.closest?.('.aimant, .voix-jouer, .langues button');
      if (!b) return;
      const r = b.getBoundingClientRect();
      b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.22}px ${(e.clientY - r.top - r.height / 2) * 0.28}px`;
      b.addEventListener('pointerleave', () => { b.style.translate = ''; }, { once: true });
    });
  }

  document.querySelectorAll('[data-page]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    balayer(() => { location.href = a.getAttribute('href'); });
  }));

  const menu = $('#menu-bouton');
  const ouvrir = (ouvert) => { entete.classList.toggle('ouvert', ouvert); menu.setAttribute('aria-expanded', String(ouvert)); };
  menu.addEventListener('click', () => ouvrir(!entete.classList.contains('ouvert')));
  $('#navigation').addEventListener('click', (e) => { if (e.target.closest('a')) ouvrir(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ouvrir(false); });
}

/* ===================== Démarrage ===================== */
async function demarrer() {
  const charger = (route) => fetch(route).then((r) => { if (!r.ok) throw new Error(route); return r.json(); });
  const [regions, provinces, lieux, recits, medias] = await Promise.all(['/api/regions.json', '/api/provinces.json', '/api/lieux.json', '/api/recits.json', '/api/medias.json'].map(charger));
  Object.assign(etat, { regions, provinces, recits, medias, lieux: new Map(lieux.map((l) => [l.id, l])) });
  dessinerCarte();
  afficherLangues();
  afficherRecueil();
  afficherParcours();
  afficherLieuxEtMouvement();
  if (!modePublic) construireFormulaire();
  $('#retour-carte').addEventListener('click', () => { etat.lieu = null; selectionnerRegion(null); });
  if (!modePublic) document.querySelectorAll('[data-contribuer]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); preparerContribution(etat.lieu?.id); }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && etat.region) { etat.lieu = null; selectionnerRegion(null); } });
  miseEnScene();
}

demarrer().catch((erreur) => {
  console.error(erreur);
  document.documentElement.classList.add('pret');
  document.querySelector('.chargement')?.remove();
  $('#liste-regions').innerHTML = modePublic
    ? '<p class="statut erreur">La carte n’a pas pu être chargée. Réessayez plus tard.</p>'
    : '<p class="statut erreur">La carte n’a pas pu être chargée. Vérifiez que le serveur est démarré (npm start).</p>';
});
