/* La veillée immersive : un village en vraie 3D (WebGL), marche libre, son spatialisé et mode casque (WebXR). */
import * as THREE from '/lib/three.module.min.js';
import { animal } from '/art.js';

const $ = (s) => document.querySelector(s);
const modePublic = document.documentElement.dataset.public === 'oui';
const parametres = new URLSearchParams(location.search);
const hasard = (() => { let s = 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();

let recits;
try {
  const reponse = await fetch(modePublic ? '/api/recits.json' : '/api/recits');
  if (!reponse.ok) throw new Error('Impossible de charger les récits de la veillée.');
  recits = (await reponse.json()).filter((r) => modePublic ? r.etapes?.length || r.audio?.length : r.transcription?.length);
  if (!recits.length) throw new Error('Aucun récit disponible pour la veillée.');
} catch (erreur) {
  $('#seuil-texte').textContent = 'Les récits sont momentanément indisponibles. Revenez à la carte et réessayez plus tard.';
  $('#entrer').hidden = true;
  throw erreur;
}
let recit = recits.find((r) => r.id === parametres.get('recit')) ?? recits.find((r) => r.film) ?? recits[0];

function afficherChoix() {
  $('#seuil-contes').innerHTML = recits.map((r) => `<button type="button" data-id="${r.id}" aria-pressed="${r.id === recit.id}"><small>${r.audio?.length ? `Voix en ${r.langue}` : 'Lecture française de synthèse'}</small>${r.titre}</button>`).join('');
  $('#seuil-contes').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    recit = recits.find((r) => r.id === b.dataset.id);
    afficherChoix();
    peuplerAnimaux();
  }));
}
afficherChoix();

/* ---------- Monde ---------- */
const hote = $('#monde');
let rendu;
try {
  rendu = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch {
  $('#seuil-texte').textContent = 'Votre navigateur ne permet pas la 3D. Vous pouvez écouter ce conte depuis le site.';
  $('#entrer').hidden = true;
  throw new Error('WebGL indisponible');
}
const leger = innerWidth < 700;
const mouvementReduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
rendu.setPixelRatio(Math.min(devicePixelRatio, leger ? 1.3 : 1.8));
rendu.setSize(innerWidth, innerHeight);
rendu.shadowMap.enabled = !leger;
rendu.shadowMap.type = THREE.PCFSoftShadowMap;
rendu.outputColorSpace = THREE.SRGBColorSpace;
rendu.toneMapping = THREE.ACESFilmicToneMapping;
rendu.toneMappingExposure = 1.15;
rendu.xr.enabled = true;
hote.append(rendu.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070d2a, 0.022);
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.08, 500);
const porteur = new THREE.Group();
porteur.position.set(0, 0, 7.2);
porteur.add(camera);
camera.position.y = 1.62;
scene.add(porteur);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); rendu.setSize(innerWidth, innerHeight); });

// Ciel : dégradé de nuit, étoiles et lune.
scene.add(new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'varying vec3 p; void main(){ float h = max(p.y,0.); vec3 c = mix(vec3(.17,.12,.26), vec3(.02,.04,.14), pow(h,.42)); c += vec3(.5,.2,.06)*pow(1.-h,9.)*.5; gl_FragColor = vec4(c,1.); }'
})));
const nb = leger ? 900 : 2400, et = new Float32Array(nb * 3);
for (let i = 0; i < nb; i++) { const a = hasard() * 6.283, h = 0.04 + hasard() * 1.5, r = 300; et[i * 3] = r * Math.cos(a) * Math.cos(h); et[i * 3 + 1] = r * Math.sin(h); et[i * 3 + 2] = r * Math.sin(a) * Math.cos(h); }
const geoEt = new THREE.BufferGeometry(); geoEt.setAttribute('position', new THREE.BufferAttribute(et, 3));
scene.add(new THREE.Points(geoEt, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 })));
const lune = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf6efd8, fog: false }));
lune.position.set(-120, 150, -200); scene.add(lune);
const lumiereLune = new THREE.DirectionalLight(0x8fa8ff, 0.55);
lumiereLune.position.copy(lune.position); scene.add(lumiereLune, new THREE.AmbientLight(0x394a86, 0.5));

// Sol : relief doux, latérite près du feu, herbe sèche au loin.
const geoSol = new THREE.PlaneGeometry(420, 420, leger ? 90 : 180, leger ? 90 : 180); geoSol.rotateX(-Math.PI / 2);
const posSol = geoSol.attributes.position, couleursSol = new Float32Array(posSol.count * 3);
const relief = (x, z) => { const d = Math.hypot(x, z); return Math.max(0, d - 26) * 0.012 * (Math.sin(x * 0.05) * Math.cos(z * 0.06) * 12 + Math.sin(x * 0.17 + z * 0.13) * 2.4); };
for (let i = 0; i < posSol.count; i++) {
  const x = posSol.getX(i), z = posSol.getZ(i), d = Math.hypot(x, z);
  posSol.setY(i, relief(x, z));
  const m = Math.min(1, d / 42), b = hasard() * 0.05;
  couleursSol[i * 3] = 0.52 - m * 0.3 + b; couleursSol[i * 3 + 1] = 0.26 - m * 0.04 + b * 0.6; couleursSol[i * 3 + 2] = 0.13 + m * 0.02;
}
geoSol.setAttribute('color', new THREE.BufferAttribute(couleursSol, 3)); geoSol.computeVertexNormals();
const sol = new THREE.Mesh(geoSol, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
sol.receiveShadow = true; scene.add(sol);

// Touffes d'herbe.
const herbe = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.8, 4), new THREE.MeshStandardMaterial({ color: 0x5a4f25, roughness: 1 }), leger ? 500 : 1800);
const mat = new THREE.Matrix4();
for (let i = 0; i < herbe.count; i++) { const a = hasard() * 6.283, d = 13 + hasard() * 90, x = Math.cos(a) * d, z = Math.sin(a) * d, s = 0.5 + hasard() * 1.2; mat.compose(new THREE.Vector3(x, relief(x, z) + 0.3 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); herbe.setMatrixAt(i, mat); }
scene.add(herbe);

/* Motif peint à la main sur les cases, façon kassena. */
function motifKassena(fond, encre, or) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = fond; x.fillRect(0, 0, 512, 256);
  x.lineWidth = 7; x.strokeStyle = encre; x.fillStyle = encre;
  for (let r = 0; r < 4; r++) for (let i = -1; i < 11; i++) {
    const px = i * 52 + (r % 2) * 26, py = 22 + r * 62;
    x.beginPath(); x.moveTo(px, py + 26); x.lineTo(px + 26, py); x.lineTo(px + 52, py + 26); x.lineTo(px + 26, py + 52); x.closePath();
    if ((i + r) % 3 === 0) { x.fillStyle = or; x.fill(); x.fillStyle = encre; } else if ((i + r) % 3 === 1) x.fill(); else x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(2, 1);
  return t;
}
const murs = [motifKassena('#a8552c', '#1c120e', '#ecd9b3'), motifKassena('#c9a06a', '#22140f', '#8c2f1c'), motifKassena('#7c3a24', '#efe3cc', '#120a08')].map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.96 }));
const chaume = new THREE.MeshStandardMaterial({ color: 0x8d6f3c, roughness: 1, flatShading: true });
const ombre = (m) => { m.castShadow = m.receiveShadow = true; return m; };

function maison(x, z, s, type) {
  const g = new THREE.Group();
  if (type === 0) {
    g.add(ombre(new THREE.Mesh(new THREE.CylinderGeometry(2, 2.15, 2.7, 22), murs[Math.floor(hasard() * 3)])));
    g.children[0].position.y = 1.35;
    const toit = ombre(new THREE.Mesh(new THREE.ConeGeometry(2.9, 2.5, 14, 2), chaume)); toit.position.y = 3.9; g.add(toit);
    const pointe = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 6), chaume); pointe.position.y = 5.3; g.add(pointe);
  } else {
    const corps = ombre(new THREE.Mesh(new THREE.BoxGeometry(5, 2.9, 4), murs[Math.floor(hasard() * 3)])); corps.position.y = 1.45; g.add(corps);
    const toit = ombre(new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.3, 4.3), new THREE.MeshStandardMaterial({ color: 0x5e3a22, roughness: 1 }))); toit.position.y = 3; g.add(toit);
    const jarre = ombre(new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), new THREE.MeshStandardMaterial({ color: 0x8a4a22, roughness: 0.7 }))); jarre.position.set(1.4, 3.5, 1); g.add(jarre);
  }
  const porte = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x070405 }));
  porte.scale.y = 2.2; porte.position.set(0, 0.05, type === 0 ? 2.13 : 2.02); g.add(porte);
  g.position.set(x, relief(x, z), z); g.scale.setScalar(s); g.rotation.y = Math.atan2(-x, -z);
  scene.add(g);
}
// Le village forme un cercle ouvert autour du feu.
for (let i = 0; i < 14; i++) { if (i === 3) continue; const a = (i / 14) * 6.283 + hasard() * 0.15, d = 19 + hasard() * 9; maison(Math.cos(a) * d, Math.sin(a) * d, 0.9 + hasard() * 0.4, i % 4 === 1 ? 1 : 0); }

// Arbres.
const ecorce = new THREE.MeshStandardMaterial({ color: 0x3d2c22, roughness: 1 }), feuilles = new THREE.MeshStandardMaterial({ color: 0x2d4a2a, roughness: 1, flatShading: true });
function baobab(x, z, s) {
  const g = new THREE.Group();
  const tronc = ombre(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.9, 6.4, 14), ecorce)); tronc.position.y = 3.2; g.add(tronc);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 6.283, b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.42, 4.6, 6), ecorce);
    b.position.set(Math.cos(a) * 1.9, 7.4, Math.sin(a) * 1.9); b.rotation.set(Math.sin(a) * 0.85, 0, -Math.cos(a) * 0.85); g.add(b);
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), feuilles); f.position.set(Math.cos(a) * 3.6, 9.1, Math.sin(a) * 3.6); f.scale.y = 0.55; g.add(f);
  }
  g.position.set(x, relief(x, z) - 0.1, z); g.scale.setScalar(s); scene.add(g);
}
function acacia(x, z, s) {
  const g = new THREE.Group();
  const t = ombre(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 4.6, 8), ecorce)); t.position.y = 2.3; g.add(t);
  for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 1), feuilles); f.scale.set(1.3, 0.28, 1.3); f.position.set((i - 2) * 1.05, 4.9 + (2 - Math.abs(i - 2)) * 0.28, (i % 2) * 0.9 - 0.4); g.add(f); }
  g.position.set(x, relief(x, z), z); g.scale.setScalar(s); g.rotation.y = hasard() * 6; scene.add(g);
}
baobab(-13, -9, 1.5); baobab(38, 18, 2); baobab(-52, 30, 2.3);
for (let i = 0; i < (leger ? 18 : 34); i++) { const a = hasard() * 6.283, d = 36 + hasard() * 90; acacia(Math.cos(a) * d, Math.sin(a) * d, 0.9 + hasard() * 0.9); }

/* Le feu : pierres, bûches, flammes en particules. */
const feu = new THREE.Group(); scene.add(feu);
const pierre = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 1, flatShading: true });
for (let i = 0; i < 11; i++) { const a = (i / 11) * 6.283, m = ombre(new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + hasard() * 0.1), pierre)); m.position.set(Math.cos(a) * 0.95, 0.12, Math.sin(a) * 0.95); feu.add(m); }
for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 1.45, 7), new THREE.MeshStandardMaterial({ color: 0x241510, emissive: 0x6a1f06, emissiveIntensity: 0.8 })); b.rotation.set(1.2, (i / 5) * 6.283, 0.15); b.position.y = 0.3; feu.add(b); }
const flammeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(0.3, 'rgba(255,160,50,.8)'); g.addColorStop(0.7, 'rgba(220,60,10,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const flammes = Array.from({ length: leger ? 34 : 70 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flammeTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); feu.add(s); return { s, t: hasard(), v: 0.5 + hasard() * 0.8, a: hasard() * 6.28, r: hasard() * 0.42 }; });
const NB_BRAISES = leger ? 50 : 130, posB = new Float32Array(NB_BRAISES * 3), infoB = [];
for (let i = 0; i < NB_BRAISES; i++) { infoB.push({ t: hasard(), v: 0.06 + hasard() * 0.16, a: hasard() * 6.28, r: 0.2 + hasard() * 0.6 }); }
const geoB = new THREE.BufferGeometry(); geoB.setAttribute('position', new THREE.BufferAttribute(posB, 3));
feu.add(new THREE.Points(geoB, new THREE.PointsMaterial({ color: 0xffa040, size: 0.07, map: flammeTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
const lumiereFeu = new THREE.PointLight(0xff8a3a, 90, 34, 1.7);
lumiereFeu.position.y = 1.4; lumiereFeu.castShadow = !leger; lumiereFeu.shadow.mapSize.set(1024, 1024); lumiereFeu.shadow.bias = -0.002; scene.add(lumiereFeu);

/* Le conteur et ses auditeurs, en boubous de Faso Dan Fani. */
function tissu(a, b, c) {
  const k = document.createElement('canvas'); k.width = 64; k.height = 128; const x = k.getContext('2d');
  [a, b, c, b].forEach((col, i) => { x.fillStyle = col; x.fillRect(i * 16, 0, 16, 128); });
  const t = new THREE.CanvasTexture(k); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const peaux = [0x4a2c1c, 0x3b2216, 0x54321f];
const tissus = [['#22397a', '#eeb44f', '#efe3cc'], ['#8c2f1c', '#efe3cc', '#22397a'], ['#2f7a5a', '#eeb44f', '#120a08'], ['#c9611f', '#22397a', '#efe3cc'], ['#efe3cc', '#8c2f1c', '#2f7a5a']];
function personne(x, z, assis, i) {
  const g = new THREE.Group(), t = tissus[i % tissus.length];
  const robe = new THREE.MeshStandardMaterial({ map: tissu(...t), roughness: 0.95 }), peau = new THREE.MeshStandardMaterial({ color: peaux[i % 3], roughness: 0.7 });
  const h = assis ? 0.82 : 1.42;
  const corps = ombre(new THREE.Mesh(new THREE.CylinderGeometry(0.18, assis ? 0.5 : 0.42, h, 12), robe)); corps.position.y = h / 2; g.add(corps);
  const tete = ombre(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), peau)); tete.position.y = h + 0.17; g.add(tete);
  const bras = [-1, 1].map((c) => { const pivot = new THREE.Group(); pivot.position.set(c * 0.2, h - 0.07, 0); const b = ombre(new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.48, 4, 8), robe)); b.position.y = -0.3; pivot.add(b); pivot.rotation.x = assis ? 0.7 : 0.2; g.add(pivot); return pivot; });
  if (!assis) { const bonnet = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.16, 12), robe); bonnet.position.y = h + 0.32; g.add(bonnet); }
  g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); scene.add(g);
  return { g, tete, bras, phase: hasard() * 6.28, hautTete: h + 0.17 };
}
const conteur = personne(0, -2.05, false, 0);
const auditeurs = [];
for (let i = 0; i < 12; i++) { const a = -0.25 + (i / 11) * (Math.PI + 0.5), d = 2.75 + (i % 2) * 0.75; auditeurs.push(personne(Math.cos(a) * d, Math.sin(a) * d, true, i + 1)); }

/* L'écran de veillée : le film du conte, projeté comme sur un mur de case. */
const ecran = new THREE.Group(); ecran.position.set(0, 0, -7.2); scene.add(ecran);
const cadreMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 1 });
[-3.72, 3.72].forEach((x) => { const p = ombre(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 5.1, 8), cadreMat)); p.position.set(x, 2.55, 0); ecran.add(p); });
const traverse = new THREE.Mesh(new THREE.BoxGeometry(7.7, 0.14, 0.14), cadreMat); traverse.position.set(0, 4.9, 0); ecran.add(traverse);
const toile = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.05), new THREE.MeshBasicMaterial({ color: 0x0b0f22 }));
toile.position.y = 2.82; ecran.add(toile);

/* Animaux du conte : silhouettes qui rôdent à la lisière de la lumière. */
const ACTEURS = { 'hyene-et-bouc': ['hyene', 'bouc'], 'lievre-elephant-hippopotame': ['elephant', 'hippopotame', 'lievre'], 'singe-et-hyene': ['hyene', 'singe', 'lievre'], 'marigot-tari': ['lion', 'hyene', 'boeuf'], 'yaare-e-fowru': ['hyene', 'elephant', 'scorpion'], ndotti: ['oiseau', 'boeuf'] };
const TAILLES = { hyene: 1, bouc: 0.75, elephant: 2.6, hippopotame: 1.4, lievre: 0.42, singe: 0.65, lion: 1.3, boeuf: 1.3, oiseau: 0.42, scorpion: 0.5 };
let rodeurs = [];
function silhouette(nom) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-160 -170 320 180" width="640" height="360">${animal(nom, 0, 0, 1, { couleur: '#04040c' })}</svg>`;
  const img = new Image(); const t = new THREE.Texture(img);
  img.onload = () => { t.needsUpdate = true; };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function peuplerAnimaux() {
  rodeurs.forEach((r) => scene.remove(r.m)); rodeurs = [];
  (ACTEURS[recit.id] ?? []).forEach((nom, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), new THREE.MeshBasicMaterial({ map: silhouette(nom), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, fog: false }));
    const s = TAILLES[nom] ?? 1; m.scale.setScalar(s * 1.7);
    scene.add(m);
    rodeurs.push({ m, a: i * 2.1 + 0.4, v: (0.045 + i * 0.012) * (i % 2 ? -1 : 1), d: 11 + i * 2.2, s: s * 1.7 });
  });
}
peuplerAnimaux();

/* Lucioles. */
const NB_L = leger ? 40 : 110, posL = new Float32Array(NB_L * 3), infoL = [];
for (let i = 0; i < NB_L; i++) infoL.push({ a: hasard() * 6.28, d: 6 + hasard() * 28, h: 0.5 + hasard() * 2.2, v: 0.04 + hasard() * 0.1, p: hasard() * 6 });
const geoL = new THREE.BufferGeometry(); geoL.setAttribute('position', new THREE.BufferAttribute(posL, 3));
scene.add(new THREE.Points(geoL, new THREE.PointsMaterial({ color: 0xd8ff8a, size: 0.09, map: flammeTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));

/* Le texte dans le casque : la page n'y est pas visible, alors un panneau suit le regard dans la scène.
   ?casque=1 montre ce panneau à l'écran, pour le vérifier sans casque. */
const apercuCasque = parametres.has('casque');
const toileTexte = document.createElement('canvas'); toileTexte.width = 1536; toileTexte.height = 720;
const dessinTexte = toileTexte.getContext('2d');
const textureTexte = new THREE.CanvasTexture(toileTexte); textureTexte.colorSpace = THREE.SRGBColorSpace; textureTexte.anisotropy = 4;
const panneau = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.75), new THREE.MeshBasicMaterial({ map: textureTexte, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
panneau.renderOrder = 999; panneau.visible = false; scene.add(panneau);
const POLICE_LANGUE = '"Noto Serif","DejaVu Serif",serif', POLICE_FR = 'Lexend,"DejaVu Sans",sans-serif';
function couper(texte, largeur) {
  const lignes = []; let ligne = '';
  for (const mot of texte.split(/\s+/)) {
    const essai = ligne ? `${ligne} ${mot}` : mot;
    if (ligne && dessinTexte.measureText(essai).width > largeur) { lignes.push(ligne); ligne = mot; } else ligne = essai;
  }
  if (ligne) lignes.push(ligne);
  return lignes;
}
function dessinerPanneau(original, francais, mention) {
  const W = toileTexte.width, H = toileTexte.height, marge = 52, largeur = W - marge * 2, x = dessinTexte;
  // Les chants tiennent en une seule longue phrase : le texte rétrécit pour rester entier, sans passer sous un corps lisible.
  let corps = 60, o = [], f = [], hauteur = 0;
  for (; corps >= 34; corps -= 4) {
    x.font = `400 ${Math.round(corps * 0.88)}px ${POLICE_LANGUE}`; o = original ? couper(original, largeur) : [];
    x.font = `400 ${corps}px ${POLICE_FR}`; f = francais ? couper(francais, largeur) : [];
    hauteur = o.length * corps * 1.16 + f.length * corps * 1.26 + (o.length && f.length ? 22 : 0) + (mention ? 44 : 0) + 64;
    if (hauteur <= H) break;
  }
  hauteur = Math.min(hauteur, H);
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(5,11,34,.86)';
  x.beginPath(); x.roundRect(0, (H - hauteur) / 2, W, hauteur, 34); x.fill();
  x.textAlign = 'center'; x.textBaseline = 'top';
  let y = (H - hauteur) / 2 + 32;
  x.font = `400 ${Math.round(corps * 0.88)}px ${POLICE_LANGUE}`; x.fillStyle = '#eeb44f';
  for (const l of o) { x.fillText(l, W / 2, y); y += corps * 1.16; }
  if (o.length && f.length) y += 22;
  x.font = `400 ${corps}px ${POLICE_FR}`; x.fillStyle = '#ffffff';
  for (const l of f) { x.fillText(l, W / 2, y); y += corps * 1.26; }
  if (mention) { x.font = `300 34px ${POLICE_FR}`; x.fillStyle = 'rgba(255,255,255,.72)'; x.fillText(mention, W / 2, y + 8); }
  textureTexte.needsUpdate = true;
}
let dernierTexte = '';
function poserTexte(original, francais) {
  const cle = `${original}\n${francais}`;
  if (cle === dernierTexte) return;
  dernierTexte = cle;
  $('#hud-original').textContent = original; $('#hud-francais').textContent = francais;
  panneau.userData.plein = Boolean(original || francais);
  if (!panneau.userData.plein) return;
  const mention = francais && recit.traductionDeTravail ? 'Français : traduction de travail, à faire relire' : '';
  dessinerPanneau(original, francais, mention);
  // La police peut arriver après le premier dessin, surtout pour les lettres ɛ, ɔ, ɩ, ʋ, ɗ et ɓ.
  Promise.all([document.fonts.load(`400 52px "Noto Serif"`, original || 'a'), document.fonts.load('400 60px Lexend', francais || 'a')])
    .then(() => { if (cle === dernierTexte) dessinerPanneau(original, francais, mention); }).catch(() => {});
}
/* Le panneau reste en place tant que le regard ne s'en écarte pas trop : un texte collé à la tête fatigue. */
let capPanneau = null;
const posTete = new THREE.Vector3(), regard = new THREE.Vector3();
function placerPanneau(dt) {
  const enCasque = rendu.xr.isPresenting || apercuCasque;
  panneau.visible = enCasque && Boolean(panneau.userData.plein);
  if (!panneau.visible) return;
  const tete = rendu.xr.isPresenting ? rendu.xr.getCamera() : camera;
  posTete.setFromMatrixPosition(tete.matrixWorld);
  regard.setFromMatrixColumn(tete.matrixWorld, 2);
  const cap = Math.atan2(regard.x, regard.z);
  if (capPanneau === null) capPanneau = cap;
  const ecart = Math.atan2(Math.sin(cap - capPanneau), Math.cos(cap - capPanneau));
  panneau.userData.suit = Math.abs(ecart) > 0.42 || (panneau.userData.suit && Math.abs(ecart) > 0.04);
  if (panneau.userData.suit) capPanneau += ecart * (1 - Math.exp(-dt * 3.5));
  panneau.position.set(posTete.x - Math.sin(capPanneau) * 2.5, posTete.y - 0.62, posTete.z - Math.cos(capPanneau) * 2.5);
  panneau.rotation.set(0, capPanneau, 0);
}

/* ---------- Son et film ---------- */
let media = null, positionnel = null, ecoute = null, ctx = null, numeroEtape = 0;
function signalerErreurLecture(erreur) {
  if (!modePublic || erreur?.name === 'AbortError') return;
  const message = $('#hud-erreur');
  message.textContent = 'La lecture est indisponible. Revenez à la fiche du récit sur la carte pour réessayer.';
  message.hidden = false;
  if (erreur?.type === 'error') $('#hud-son').disabled = true;
}
function lancerConte() {
  const video = recit.film ? document.createElement('video') : null;
  media = video ?? new Audio();
  numeroEtape = 0;
  media.src = recit.film ? `/films/${recit.film}` : recit.audio?.length ? `/audio/${recit.audio[0].fichier}` : `/audio/fr-${recit.id}-1.mp3`;
  media.crossOrigin = 'anonymous'; media.playsInline = true; media.preload = 'auto'; media.loop = Boolean(recit.audio?.length);
  if (modePublic) media.addEventListener('error', signalerErreurLecture);
  if (modePublic && !recit.audio?.length) media.addEventListener('ended', () => {
    if (numeroEtape + 1 < recit.etapes.length) {
      numeroEtape++;
      media.src = `/audio/fr-${recit.id}-${numeroEtape + 1}.mp3`;
      poserTexte('', recit.etapes[numeroEtape]);
      media.play().catch(signalerErreurLecture);
    } else $('#hud-son').setAttribute('aria-label', 'Réécouter la dernière étape');
  });
  ecoute = new THREE.AudioListener(); camera.add(ecoute); ctx = ecoute.context;
  ctx.resume();
  positionnel = new THREE.PositionalAudio(ecoute);
  positionnel.setMediaElementSource(media);
  positionnel.setRefDistance(3.2); positionnel.setRolloffFactor(1.25); positionnel.setDistanceModel('inverse');
  conteur.g.add(positionnel);
  if (video) { const t = new THREE.VideoTexture(video); t.colorSpace = THREE.SRGBColorSpace; toile.material = new THREE.MeshBasicMaterial({ map: t, toneMapped: false, fog: false }); }
  else { ecran.visible = false; }
  media.play().catch(signalerErreurLecture);
  ambiance();
}
/* Ambiance créée par le navigateur : crépitement du feu et grillons. */
function ambiance() {
  const durée = 4, tampon = ctx.createBuffer(1, ctx.sampleRate * durée, ctx.sampleRate), d = tampon.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() < 0.0012 ? (Math.random() - 0.5) * 1.5 : 0) + (Math.random() - 0.5) * 0.012;
  const src = ctx.createBufferSource(); src.buffer = tampon; src.loop = true;
  const crep = new THREE.PositionalAudio(ecoute); crep.setNodeSource(src); crep.setRefDistance(2); crep.setRolloffFactor(1.6); crep.setVolume(0.5);
  feu.add(crep); src.start();
  const gril = ctx.createOscillator(), trem = ctx.createOscillator(), tg = ctx.createGain(), g = ctx.createGain();
  gril.frequency.value = 4300; trem.type = 'square'; trem.frequency.value = 17; trem.connect(tg.gain); tg.gain.value = 0.5; gril.connect(tg); tg.connect(g); g.gain.value = 0.0035; g.connect(ctx.destination); gril.start(); trem.start();
}

/* ---------- Marche et regard ---------- */
const touches = {};
addEventListener('keydown', (e) => { touches[e.code] = true; });
addEventListener('keyup', (e) => { touches[e.code] = false; });
let lacet = 0, tangage = -0.02, glisse = null, avance = false;
hote.addEventListener('pointerdown', (e) => { glisse = { x: e.clientX, y: e.clientY, l: lacet, t: tangage }; hote.setPointerCapture(e.pointerId); });
hote.addEventListener('pointermove', (e) => { if (!glisse || rendu.xr.isPresenting) return; lacet = glisse.l - (e.clientX - glisse.x) * 0.004; tangage = Math.max(-1.25, Math.min(1.25, glisse.t - (e.clientY - glisse.y) * 0.004)); });
hote.addEventListener('pointerup', () => { glisse = null; });
const bAvancer = $('#hud-avancer');
['pointerdown'].forEach((n) => bAvancer.addEventListener(n, (e) => { e.preventDefault(); avance = true; bAvancer.setAttribute('aria-pressed', 'true'); }));
['pointerup', 'pointerleave', 'pointercancel'].forEach((n) => bAvancer.addEventListener(n, () => { avance = false; bAvancer.setAttribute('aria-pressed', 'false'); }));
bAvancer.addEventListener('click', (e) => { // Activation clavier ou lecteur d'écran : un clic active, le suivant arrête.
  if (e.detail !== 0) return;
  avance = !avance;
  bAvancer.setAttribute('aria-pressed', String(avance));
});

function bouger(dt) {
  let av = (touches.KeyW || touches.KeyZ || touches.ArrowUp || avance ? 1 : 0) - (touches.KeyS || touches.ArrowDown ? 1 : 0);
  let cote = (touches.KeyD || touches.ArrowRight ? 1 : 0) - (touches.KeyA || touches.KeyQ || touches.ArrowLeft ? 1 : 0);
  let direction = lacet;
  if (rendu.xr.isPresenting) {
    const v = new THREE.Vector3(); rendu.xr.getCamera().getWorldDirection(v); direction = Math.atan2(-v.x, -v.z);
    for (const src of rendu.xr.getSession().inputSources) if (src.gamepad?.axes.length >= 4) { const [, , ax, ay] = src.gamepad.axes; if (Math.abs(ay) > 0.15) av = -ay; if (Math.abs(ax) > 0.15) cote = ax; }
  }
  if (!av && !cote) return;
  const vit = (touches.ShiftLeft ? 4.6 : 2.6) * dt, s = Math.sin(direction), c = Math.cos(direction);
  let x = porteur.position.x + (-s * av + c * cote) * vit, z = porteur.position.z + (-c * av - s * cote) * vit;
  const d = Math.hypot(x, z);
  if (d < 1.5) { x *= 1.5 / d; z *= 1.5 / d; }
  if (d > 60) { x *= 60 / d; z *= 60 / d; }
  porteur.position.x = x; porteur.position.z = z; porteur.position.y = relief(x, z);
}

/* ---------- Boucle ---------- */
const horloge = new THREE.Clock();
let depart = false, travelling = 0;
rendu.setAnimationLoop(() => {
  const dt = Math.min(horloge.getDelta(), 0.05), t = mouvementReduit ? 0 : horloge.elapsedTime;
  const pasAnimation = mouvementReduit ? 0 : dt;
  if (!rendu.xr.isPresenting) {
    if (!depart) { // Avant d'entrer : la caméra tourne autour du feu, sauf si le mouvement est réduit.
      travelling += pasAnimation * 0.09;
      porteur.position.set(Math.sin(travelling) * 13, 1.2, Math.cos(travelling) * 13);
      camera.rotation.set(-0.04, travelling, 0, 'YXZ');
    } else {
      bouger(dt);
      camera.rotation.set(tangage, lacet, 0, 'YXZ');
    }
  } else bouger(dt);

  for (const f of flammes) {
    f.t += pasAnimation * f.v; if (f.t > 1) { f.t = 0; f.a = Math.random() * 6.28; f.r = Math.random() * 0.42; }
    const p = f.t, r = f.r * (1 - p * 0.9);
    f.s.position.set(Math.cos(f.a + t) * r, 0.25 + p * 2.05, Math.sin(f.a + t) * r);
    f.s.scale.setScalar((1 - p) * 0.95 + 0.14); f.s.material.opacity = (1 - p) * 0.72;
  }
  infoB.forEach((b, i) => { b.t = (b.t + pasAnimation * b.v) % 1; b.a += pasAnimation * 0.6; const h = b.t * 9, r = b.r + b.t * 2.2; posB[i * 3] = Math.cos(b.a) * r; posB[i * 3 + 1] = 0.6 + h; posB[i * 3 + 2] = Math.sin(b.a) * r; });
  geoB.attributes.position.needsUpdate = true;
  lumiereFeu.intensity = 82 + Math.sin(t * 11) * 9 + Math.sin(t * 23) * 7 + Math.sin(t * 5) * 8;
  lumiereFeu.position.x = Math.sin(t * 9) * 0.08; lumiereFeu.position.z = Math.cos(t * 7) * 0.08;

  conteur.bras[1].rotation.x = -1.2 + Math.sin(t * 2.1) * 0.55; conteur.bras[1].rotation.z = -0.3 + Math.sin(t * 1.3) * 0.25;
  conteur.bras[0].rotation.x = -0.35 + Math.sin(t * 1.5 + 2) * 0.4;
  conteur.tete.rotation.y = Math.sin(t * 0.8) * 0.45;
  conteur.g.position.y = Math.abs(Math.sin(t * 1.9)) * 0.012;
  for (const a of auditeurs) { a.tete.position.y = a.hautTete + Math.sin(t * 1.1 + a.phase) * 0.012; a.tete.rotation.y = Math.sin(t * 0.32 + a.phase) * 0.35; }

  for (const r of rodeurs) {
    r.a += r.v * pasAnimation;
    const x = Math.cos(r.a) * r.d, z = Math.sin(r.a) * r.d;
    r.m.position.set(x, relief(x, z) + r.s * 0.92 + Math.abs(Math.sin(t * 4 + r.d)) * 0.05, z);
    const c = rendu.xr.isPresenting ? rendu.xr.getCamera().position : porteur.position;
    r.m.lookAt(c.x, r.m.position.y, c.z);
  }
  infoL.forEach((l, i) => { l.a += l.v * pasAnimation; posL[i * 3] = Math.cos(l.a + Math.sin(t * 0.3 + l.p)) * l.d; posL[i * 3 + 1] = l.h + Math.sin(t * 0.9 + l.p) * 0.5; posL[i * 3 + 2] = Math.sin(l.a) * l.d; });
  geoL.attributes.position.needsUpdate = true;

  if (media && recit) {
    if (modePublic && !recit.audio?.length) poserTexte('', recit.etapes[numeroEtape]);
    else if (recit.transcription?.length) {
      const instant = media.currentTime, apresTitre = !recit.film || instant > 4; // Le film ouvre sur son titre.
      const s = recit.transcription.findLast((x) => x.debut <= instant);
      const fr = recit.sousTitresFr?.findLast((x) => x.debut <= instant);
      poserTexte(s && apresTitre ? s.texte : '', fr && apresTitre && instant < fr.fin ? fr.texte : '');
    } else poserTexte('', 'Enregistrement de Rasmane Bassam en mooré : transcription non disponible.');
  }
  placerPanneau(dt);
  rendu.render(scene, camera);
});

/* ---------- Entrée ---------- */
$('#entrer').addEventListener('click', () => {
  $('#seuil').classList.add('part');
  setTimeout(() => $('#seuil').remove(), 900);
  $('#hud').hidden = false;
  $('#hud-titre').textContent = recit.titre;
  $('#hud-langue').textContent = recit.audio?.length ? `Voix en ${recit.langue}` : 'Lecture française de synthèse';
  $('#hud-original').lang = recit.codeLangue || 'fr';
  $('#hud-phrase').hidden = apercuCasque;
  depart = true;
  porteur.position.set(0, 0, 7.2); lacet = 0; tangage = -0.06;
  lancerConte();
});
$('#hud-son').addEventListener('click', () => {
  if (!media) return;
  const paused = media.paused;
  if (paused) media.play().catch(signalerErreurLecture); else media.pause();
  $('#hud-son').setAttribute('aria-label', paused ? 'Mettre en pause' : 'Reprendre');
  $('#hud-son').innerHTML = paused ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5V19.5L20 12Z" fill="currentColor"/></svg>';
});
const vr = $('#hud-vr');
if (navigator.xr) navigator.xr.isSessionSupported('immersive-vr').then((ok) => { vr.hidden = !ok; }).catch(() => {});
let session = null;
vr.addEventListener('click', async () => {
  if (session) { session.end(); return; }
  session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
  session.addEventListener('end', () => { session = null; vr.textContent = 'Casque VR'; });
  await rendu.xr.setSession(session); vr.textContent = 'Quitter le casque';
});
const avecGeste = matchMedia('(pointer: coarse)').matches;
bAvancer.hidden = !avecGeste;
window.__veillee = { camera, porteur, scene, panneau, media: () => media };
