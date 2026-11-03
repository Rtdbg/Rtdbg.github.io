/* La carte du Burkina Faso en vraie 3D (WebGL) : chaque région est un volume extrudé,
   chaque récit un feu, et des voix lumineuses voyagent entre les lieux d'une même langue. */
import * as THREE from '/lib/three.module.min.js';

const NUIT = 0x0a1530, FEU = 0xeeb44f, BRAISE = 0xd9672f, HOLO = 0x8eefe3;

function formesDepuisTrace(trace) {
  const anneaux = trace.split(/[Mm]/).map((s) => s.trim()).filter(Boolean);
  return anneaux.map((a) => {
    const pts = a.replace(/[LlZz]/g, ' ').trim().split(/\s+/).map((c) => c.split(',').map(Number)).filter((p) => p.length === 2 && p.every(Number.isFinite));
    const forme = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? forme.lineTo(x, -y) : forme.moveTo(x, -y)));
    return forme;
  });
}

function texturePoint(c1, c2) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, c1); g.addColorStop(0.28, c2); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function creerCarte3D(hote, { regions, lieux, langueDe, surRegion, surLieu, surSurvol, reduit = false }) {
  const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  rendu.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.4 : 1.8));
  rendu.shadowMap.enabled = !(innerWidth < 700);
  rendu.shadowMap.type = THREE.PCFSoftShadowMap;
  rendu.domElement.className = 'carte3d-toile';
  rendu.domElement.setAttribute('aria-hidden', 'true');
  hote.prepend(rendu.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 10, 6000);
  const groupe = new THREE.Group();
  scene.add(groupe);

  scene.add(new THREE.AmbientLight(0x8ea2e6, 0.8));
  const lune = new THREE.DirectionalLight(0xc8d6ff, 1.25);
  lune.position.set(-400, 900, 500); lune.castShadow = true;
  lune.shadow.mapSize.set(1536, 1536);
  Object.assign(lune.shadow.camera, { left: -700, right: 700, top: 600, bottom: -600, far: 2500 });
  scene.add(lune);
  const braiseLumiere = new THREE.PointLight(BRAISE, 9e3, 1200);
  braiseLumiere.position.set(0, 160, 0);
  scene.add(braiseLumiere);

  // Centre de la carte.
  const CX = 480, CY = -345;

  // Socle et trame du sol.
  const sol = new THREE.Mesh(new THREE.CircleGeometry(1500, 64), new THREE.ShadowMaterial({ color: 0x02040f, opacity: 0.55 }));
  sol.rotation.x = -Math.PI / 2; sol.position.y = -2; sol.receiveShadow = true; groupe.add(sol);
  const trame = new THREE.PolarGridHelper(1400, 12, 14, 96, 0x3a5196, 0x223566);
  trame.material.transparent = true; trame.material.opacity = 0.16; trame.position.y = -1; groupe.add(trame);

  // Régions extrudées.
  const volumes = [];
  regions.forEach((region, i) => {
    const formes = formesDepuisTrace(region.trace);
    const haut = 22 + (region.nRecits || 0) * 12;
    const geo = new THREE.ExtrudeGeometry(formes, { depth: 1, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 1.1, bevelSegments: 1, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2);
    const couleur = new THREE.Color().setHSL(0.625, 0.62, 0.2 + ((i * 37) % 17) / 240);
    const dessus = new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.62, metalness: 0.12, emissive: FEU, emissiveIntensity: 0 });
    const cote = new THREE.MeshStandardMaterial({ color: 0x14255a, roughness: 0.8 });
    const maille = new THREE.Mesh(geo, [dessus, cote]);
    maille.castShadow = maille.receiveShadow = true;
    const bord = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 35), new THREE.LineBasicMaterial({ color: FEU, transparent: true, opacity: 0.5 }));
    const pivot = new THREE.Group();
    pivot.add(maille, bord);
    pivot.position.set(-CX, 0, CY);
    pivot.scale.y = 0.01;
    groupe.add(pivot);
    // La visée est en coordonnées monde : inclure la translation du pivot.
    const boite = new THREE.Box3().setFromObject(pivot);
    const centre = boite.getCenter(new THREE.Vector3());
    const taille = boite.getSize(new THREE.Vector3());
    volumes.push({ region, pivot, maille, dessus, bord, haut, cible: haut, delai: reduit ? 0 : i * 0.06, centre, taille: Math.max(taille.x, taille.z), phase: i * 0.7 });
  });

  // Feux des récits : halo, flamme et braises.
  const halo = texturePoint('rgba(255,244,214,1)', 'rgba(238,180,79,.75)');
  const halo2 = texturePoint('rgba(255,180,90,.9)', 'rgba(217,103,47,.35)');
  const feux = [];
  const sommets = new Map(volumes.map((v) => [v.region.id, v]));
  for (const lieu of lieux) {
    if (!lieu.nRecits) continue;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const a = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const [x, y] = lieu.point;
    const p = new THREE.Vector3(x - CX, 20, y + CY);
    s.position.copy(p); a.position.copy(p);
    groupe.add(a, s);
    const lumiere = new THREE.PointLight(BRAISE, 0, 180);
    lumiere.position.copy(p); groupe.add(lumiere);
    feux.push({ lieu, s, a, p, lumiere, phase: Math.random() * 6.28, actif: 1, voix: false, volume: sommets.get(lieu.regionId) });
  }

  // Braises qui s'élèvent au-dessus de la carte.
  const NB = reduit ? 0 : 420;
  const posBraises = new Float32Array(NB * 3), vitesse = new Float32Array(NB);
  for (let i = 0; i < NB; i++) { posBraises[i * 3] = (Math.random() - 0.5) * 1100; posBraises[i * 3 + 1] = Math.random() * 420; posBraises[i * 3 + 2] = (Math.random() - 0.5) * 760; vitesse[i] = 0.2 + Math.random() * 0.9; }
  const geoBraises = new THREE.BufferGeometry();
  geoBraises.setAttribute('position', new THREE.BufferAttribute(posBraises, 3));
  const nuage = new THREE.Points(geoBraises, new THREE.PointsMaterial({ size: 7, map: halo2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffc27a }));
  groupe.add(nuage);

  // Étoiles.
  const et = new Float32Array(1500 * 3);
  for (let i = 0; i < 1500; i++) { const a = Math.random() * 6.28, b = Math.random() * 1.45, r = 2400; et[i * 3] = r * Math.cos(a) * Math.cos(b); et[i * 3 + 1] = r * Math.sin(b) + 40; et[i * 3 + 2] = r * Math.sin(a) * Math.cos(b); }
  const geoEt = new THREE.BufferGeometry(); geoEt.setAttribute('position', new THREE.BufferAttribute(et, 3));
  scene.add(new THREE.Points(geoEt, new THREE.PointsMaterial({ size: 3, color: 0xffffff, transparent: true, opacity: 0.8, sizeAttenuation: false, fog: false })));

  // Voix : des lumières voyagent en arc entre les feux d'une même langue.
  let voyageurs = [];
  const groupeVoix = new THREE.Group(); groupe.add(groupeVoix);
  function tracerVoix(langue) {
    groupeVoix.clear(); voyageurs = [];
    const dans = feux.filter((f) => langueDe(f.lieu).includes(langue));
    if (dans.length < 2) return;
    for (let i = 0; i < dans.length; i++) for (let j = i + 1; j < dans.length; j++) {
      const A = dans[i].p.clone().setY(30), B = dans[j].p.clone().setY(30);
      const M = A.clone().lerp(B, 0.5); M.y = 90 + A.distanceTo(B) * 0.42;
      const courbe = new THREE.QuadraticBezierCurve3(A, M, B);
      const ligne = new THREE.Line(new THREE.BufferGeometry().setFromPoints(courbe.getPoints(50)), new THREE.LineBasicMaterial({ color: FEU, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending }));
      groupeVoix.add(ligne);
      for (let k = 0; k < 3; k++) {
        const pt = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        pt.scale.setScalar(20); groupeVoix.add(pt);
        voyageurs.push({ courbe, pt, t: k / 3, v: 0.002 + Math.random() * 0.0016 });
      }
    }
  }

  // Interaction.
  const rayon = new THREE.Raycaster(), souris = new THREE.Vector2();
  let survol = null, selection = null, ouvert = false;
  let glisse = null, aGlisse = false, azimut = 0, azimutCible = -0.16, elevation = 0.92, elevationCible = 0.92, distance = 1780, distanceCible = 1780;
  const visee = new THREE.Vector3(), viseeCible = new THREE.Vector3(0, 10, 0);
  const pointe = (e) => { const r = rendu.domElement.getBoundingClientRect(); souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  const sous = () => { rayon.setFromCamera(souris, camera); const t = rayon.intersectObjects(volumes.map((v) => v.maille), false)[0]; return t ? volumes.find((v) => v.maille === t.object) : null; };
  const toile = rendu.domElement;
  toile.addEventListener('pointerdown', (e) => { aGlisse = false; glisse = { x: e.clientX, y: e.clientY, depart: azimutCible, el: elevationCible, bouge: 0 }; });
  addEventListener('pointerup', () => { glisse = null; });
  toile.addEventListener('pointermove', (e) => {
    pointe(e);
    if (glisse && e.pointerType === 'mouse') {
      const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y;
      glisse.bouge = Math.max(glisse.bouge, Math.abs(dx) + Math.abs(dy));
      if (glisse.bouge > 6) aGlisse = true;
      azimutCible = glisse.depart + dx * 0.005;
      elevationCible = Math.max(0.42, Math.min(1.42, glisse.el + dy * 0.004));
      return;
    }
    const v = sous();
    if (v !== survol) { survol = v; toile.style.cursor = v ? 'pointer' : 'grab'; surSurvol?.(v?.region ?? null); }
  });
  toile.addEventListener('click', (e) => {
    // pointerup a déjà effacé glisse quand le navigateur émet click.
    if (aGlisse) { aGlisse = false; return; }
    pointe(e);
    const v = sous();
    if (!v) return;
    surRegion(selection === v ? null : v.region);
  });
  // Doigt : on laisse la page défiler ; la carte tourne seule.
  toile.style.touchAction = 'pan-y';

  function dimensionner() {
    const { clientWidth: l, clientHeight: h } = hote;
    if (!l || !h) return;
    rendu.setSize(l, h, false);
    camera.aspect = l / h; camera.updateProjectionMatrix();
    distanceCible = selection ? distanceSelection() : (l / h < 1 ? 2300 : 1780);
  }
  const distanceSelection = () => {
    const distancePaysage = camera.aspect < 1 ? 1300 : 1060;
    if (!selection) return distancePaysage;
    // Les petites régions doivent être lisibles sans recadrer brutalement les grandes.
    const champ = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    return Math.min(distancePaysage, Math.max(720, selection.taille / (champ * 0.24)));
  };
  new ResizeObserver(dimensionner).observe(hote);
  dimensionner();

  // Boucle.
  const horloge = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hote);
  const lissage = (a, b, k) => a + (b - a) * k;
  function tour() {
    requestAnimationFrame(tour);
    if (!visible) return;
    const t = horloge.getElapsedTime();
    // Caméra : rotation lente tant que rien n'est choisi.
    if (!selection && !glisse && !reduit) azimutCible = -0.16 + Math.sin(t * 0.13) * 0.34;
    azimut = lissage(azimut, azimutCible, 0.04); elevation = lissage(elevation, elevationCible, 0.04); distance = lissage(distance, distanceCible, 0.04);
    visee.lerp(viseeCible, 0.05);
    camera.position.set(visee.x + Math.sin(azimut) * Math.cos(elevation) * distance, visee.y + Math.sin(elevation) * distance, visee.z + Math.cos(azimut) * Math.cos(elevation) * distance);
    camera.lookAt(visee);
    // Volumes : les régions sortent de terre, ondulent, celle qu'on choisit s'élève.
    for (const v of volumes) {
      const ne = Math.max(0, Math.min(1, (t - v.delai) / 0.9));
      const entree = 1 - (1 - ne) ** 3;
      const onde = reduit || selection ? 0 : Math.sin(t * 0.9 + v.phase) * 3.5;
      const estChoisi = selection === v, estSurvol = survol === v;
      const cible = selection ? (estChoisi ? 58 : 5) : v.haut + (estSurvol ? 22 : 0) + onde;
      v.pivot.scale.y = lissage(v.pivot.scale.y, Math.max(0.5, cible * entree), 0.09);
      const lueur = estChoisi ? 0.42 : estSurvol ? 0.2 : 0;
      v.dessus.emissiveIntensity = lissage(v.dessus.emissiveIntensity, lueur, 0.1);
      v.bord.material.opacity = selection && !estChoisi ? 0.18 : 0.55;
    }
    // Feux posés sur le dessus des régions.
    for (const f of feux) {
      const h = (f.volume?.pivot.scale.y ?? 20) + 6;
      const b = 1 + Math.sin(t * 7 + f.phase) * 0.12 + Math.sin(t * 13 + f.phase) * 0.07;
      const base = f.voix ? 58 : f.actif ? 38 : 16;
      f.s.position.y = h + 6; f.a.position.y = h + 6; f.lumiere.position.y = h + 18;
      f.s.scale.setScalar(base * b * 0.8); f.a.scale.setScalar(base * 3 * b);
      f.s.material.opacity = lissage(f.s.material.opacity, f.actif ? 1 : 0.4, 0.08); f.a.material.opacity = lissage(f.a.material.opacity, f.actif ? 0.8 : 0.2, 0.08);
      f.lumiere.intensity = lissage(f.lumiere.intensity, f.actif ? 460 * b : 30, 0.08);
    }
    braiseLumiere.intensity = 9e3 + Math.sin(t * 2.2) * 2.5e3;
    for (const w of voyageurs) { w.t = (w.t + w.v) % 1; w.courbe.getPoint(w.t, w.pt.position); w.pt.material.opacity = Math.sin(w.t * Math.PI); }
    if (NB) {
      for (let i = 0; i < NB; i++) { posBraises[i * 3 + 1] += vitesse[i]; posBraises[i * 3] += Math.sin(t + i) * 0.14; if (posBraises[i * 3 + 1] > 440) posBraises[i * 3 + 1] = 0; }
      geoBraises.attributes.position.needsUpdate = true;
    }
    rendu.render(scene, camera);
  }
  tour();

  return {
    choisir(region) {
      selection = region ? volumes.find((v) => v.region.id === region.id) : null;
      if (selection) {
        viseeCible.set(selection.centre.x, 12, selection.centre.z);
        azimutCible = 0; elevationCible = 1.32; distanceCible = distanceSelection();
      } else {
        viseeCible.set(0, 10, 0); elevationCible = 0.92; distanceCible = hote.clientWidth / hote.clientHeight < 1 ? 2300 : 1780;
      }
    },
    ecouter(langue, lieuId) {
      for (const f of feux) { f.actif = langueDe(f.lieu).includes(langue); f.voix = f.lieu.id === lieuId; }
      tracerVoix(langue);
    },
    projeter(point) {
      // Position à l'écran d'un lieu, pour poser une étiquette HTML.
      const [x, y] = point;
      const volume = volumes.find((v) => v === selection);
      const p = new THREE.Vector3(x - CX, (volume?.pivot.scale.y ?? 20) + 10, y + CY).project(camera);
      return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
    }
  };
}

export function webglDisponible() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}
