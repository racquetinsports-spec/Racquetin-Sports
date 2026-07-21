import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { fetchProducts, fetchBestSellers, fetchNewArrivals, fetchCategoryCounts } from '../lib/api/products';
import { normalizeProducts } from '../utils/normalizeProduct';
import { recommendRackets, BUDGET_RANGES } from '../utils/racketFinder';
import { useCart } from '../hooks/useCart';
import { useSiteContent, pick } from '../hooks/useSiteContent';
import { formatPrice } from '../utils/format';
import ProductCard from '../components/product/ProductCard';

// ── Scene data ────────────────────────────────────────────────────
// pos → CSS class suffix, determines unique layout per scene
//
// Each scene's copy is matched to what the camera keyframes (see KF
// below) actually show at that point in the scroll, not just picked
// in an arbitrary order:
//   scene 1 (KF t=.18, target y=-2.8 — lowest point of the sequence) → grip/handle
//   scene 2 (KF t=.36, target y=-2.2 — still low, opposite side)     → shaft/frame material
//   scene 3 (KF t=.55, target y=+0.9 — upper racket)                 → head/string bed
//   scene 4 (KF t=.72, target y=+2.2 + the sequence's widest camera
//            sweep, x:-2.0→+2.2)                                     → motion/aerodynamics
// None of this — camera position, timing, or the racket's own
// rotation — was touched; only the text content changed.
const SCENES = [
  {
    pos: 'bc',   // bottom-center
    ey: 'New Season Arrival',
    h1: 'Engineered',
    h2: 'for Speed',
    body: 'Experience Precision',
    spec: null,
  },
  {
    pos: 'lm',   // left-middle — camera favors the handle/grip
    ey: '01 — Grip',
    h1: 'Control Begins',
    h2: 'In Your Hand',
    body: 'Engineered for confident handling, stable feedback, and precise shot control through every rally.',
    spec: null,
  },
  {
    pos: 'rl',   // right-lower — camera favors the shaft/frame material
    ey: '02 — Graphite',
    h1: 'Strength Without',
    h2: 'The Weight',
    body: 'Advanced graphite structures deliver stability, responsiveness, and efficient energy transfer without unnecessary bulk.',
    spec: null,
  },
  {
    pos: 'rh',   // right-upper (safe zone: top ≥ 120px) — camera favors the head/strings
    ey: '03 — String Bed',
    h1: 'Power, Shaped',
    h2: 'By Precision',
    body: 'A refined string-bed response supports clean impact, controlled touch, and consistent shuttle feedback.',
    spec: null,
  },
  {
    pos: 'rm',   // right-middle — the widest camera sweep in the sequence
    ey: '04 — Aerodynamics',
    h1: 'Built To',
    h2: 'Move Faster',
    body: 'Streamlined frame geometry reduces air resistance for quicker swings, sharper reactions, and faster recovery between shots.',
    spec: null,
  },
  {
    pos: 'cc',   // dead center — closing brand statement
    ey: 'The RacquetIn Collection',
    h1: 'Your Game.',
    h2: 'Engineered.',
    body: 'Precision-built, ready for every rally.',
    spec: null,
  },
];

// Scene index boundaries (0→1 progress mapped to scene 0–5)
// KF[i].t values: 0.00, 0.18, 0.36, 0.55, 0.72, 0.88
// Scene is active when scroll progress is in its range.
// Ranges start slightly BEFORE the KF transition so text appears immediately.
const SCENE_RANGES = [
  [0.00, 0.15],   // scene 0: full width window
  [0.16, 0.33],   // scene 1: starts at 0.16, text leads camera slightly
  [0.33, 0.52],   // scene 2
  [0.52, 0.69],   // scene 3
  [0.69, 0.85],   // scene 4
  [0.85, 1.00],   // scene 5
];

function sceneForProgress(p) {
  // Text enters slightly early (0.06 lookahead) for natural feel
  for (let i = 0; i < SCENE_RANGES.length; i++) {
    const [lo, hi] = SCENE_RANGES[i];
    if (p >= lo - 0.06 && p <= hi + 0.06) return i;
  }
  return -1;
}

// ── Text animation variants ───────────────────────────────────────
const sceneVariants = {
  initial: { opacity: 0, y: 10, filter: 'blur(3px)' },
  enter:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: .40, ease: [.16,1,.3,1] } },
  exit:    { opacity: 0, y: -8, filter: 'blur(2px)', transition: { duration: .22, ease: [.4,0,1,1] } },
};

// ── HeroCanvas ────────────────────────────────────────────────────
function HeroCanvas({ heroText, heroCta }) {
  const mountRef    = useRef(null);
  const canvasRef   = useRef(null);
  const [progress,     setProgress]     = useState(0);
  const [introStep,    setIntroStep]     = useState(0);
  // activeScene: -1 = none visible, 0–5 = scene index
  const [activeScene,  setActiveScene]   = useState(-1);
  const [showHint, setShowHint] = useState(true);
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Interaction hint: visible once the intro finishes, gone after 6s or
  // on the visitor's first mouse move / touch / scroll — whichever
  // happens first. Purely a UI overlay; touches nothing about the
  // Three.js scene, camera, or animation itself.
  useEffect(() => {
    if (introStep < 4) return;
    const dismiss = () => setShowHint(false);
    const timer = setTimeout(dismiss, 6000);
    const opts = { once: true, passive: true };
    window.addEventListener('mousemove', dismiss, opts);
    window.addEventListener('touchstart', dismiss, opts);
    window.addEventListener('wheel', dismiss, opts);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', dismiss, opts);
      window.removeEventListener('touchstart', dismiss, opts);
      window.removeEventListener('wheel', dismiss, opts);
    };
  }, [introStep]);

  function handleSkipToCategories() {
    document.getElementById('categories')?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
  // scrollP drives scene switching — updated from RAF via ref+rAF callback
  const scrollPRef  = useRef(0);
  const lastSceneRef = useRef(-1);

  // RAF → React bridge: called from inside the Three.js loop
  // Uses a requestAnimationFrame so it batches with React's scheduler
  const syncSceneRef = useRef(null);

  useEffect(() => {
    // Sync scene index to React state, debounced to animation frame
    syncSceneRef.current = (p) => {
      const next = sceneForProgress(p);
      if (next !== lastSceneRef.current) {
        lastSceneRef.current = next;
        setActiveScene(next);
      }
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ────────────────────────────────────────────────
    // alpha:true + a transparent clear (was alpha:false + opaque white)
    // is the one deliberate change here, made only so the new subtle
    // court-line background (rendered in plain HTML/SVG behind the
    // canvas — see .hero-court-lines below) can show through in the
    // empty space around the racket. Camera, GLB loading, animation
    // timings, and scroll sync below are all completely unchanged.
    // ShadowMaterial (used for the floor's contact shadow) is designed
    // to composite over whatever's behind it, so this doesn't change
    // how the racket or its shadow look — only what shows in the
    // negative space that used to be flat opaque white.
    const renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true, powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0xffffff, 0);
    mount.appendChild(renderer.domElement);
    canvasRef.current = renderer.domElement;

    // ── Scene ────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, 0.015);

    const camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 0.05, 80);
    camera.position.set(0, 0.5, 13);

    // ── Lighting ─────────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0xffffff, 0xf5f0ea, 0.7));
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 2.8);
    keyLight.position.set(-4, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far  = 30;
    keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.camera.right = keyLight.shadow.camera.top  =  6;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xe8f0ff, 1.0);
    fillLight.position.set(5, 2, 3); scene.add(fillLight);
    const rimLight  = new THREE.DirectionalLight(0xffffff, 0.65);
    rimLight.position.set(0.5, -3, -5); scene.add(rimLight);
    const topLight  = new THREE.DirectionalLight(0xffffff, 0.35);
    topLight.position.set(0, 10, 2); scene.add(topLight);
    const accentLight = new THREE.PointLight(0xfff0e8, 1.0, 20);
    accentLight.position.set(2, 4, 7); scene.add(accentLight);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.06 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5;
    floor.receiveShadow = true;
    scene.add(floor);

    // ── Math helpers ─────────────────────────────────────────────
    const lerp  = (a, b, t) => a + (b - a) * t;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const ss5   = t => { const c = clamp(t, 0, 1); return c*c*c*(c*(c*6-15)+10); };
    const exd   = (c, t, k, dt) => t + (c - t) * Math.exp(-k * dt);

    // ── Camera keyframes ─────────────────────────────────────────
    // Model is 6 units tall. Navbar is ~58px ≈ 0.8 world units at z=13.
    // Shift all camera targets and racket position DOWN by ~0.7 units
    // so the racket head clears the navbar at every scene.
    const KF = [
      { t:0.00, fov:28, cp:new THREE.Vector3( 0.0, -0.3, 13.0), ct:new THREE.Vector3(0, -0.3, 0), ry: 0.00, rz: 0.00, rx: 0.00 },
      { t:0.18, fov:23, cp:new THREE.Vector3(-1.8, -1.6,  9.0), ct:new THREE.Vector3(0, -2.8, 0), ry:-0.35, rz:-0.32, rx: 0.08 },
      { t:0.36, fov:22, cp:new THREE.Vector3( 2.2, -1.4,  8.5), ct:new THREE.Vector3(0, -2.2, 0), ry: 0.45, rz:-0.35, rx: 0.08 },
      { t:0.55, fov:23, cp:new THREE.Vector3(-2.0,  0.6,  9.0), ct:new THREE.Vector3(0,  0.9, 0), ry: 0.30, rz:-0.10, rx:-0.04 },
      { t:0.72, fov:22, cp:new THREE.Vector3( 2.2,  1.4,  8.5), ct:new THREE.Vector3(0,  2.2, 0), ry:-0.35, rz: 0.15, rx: 0.00 },
      { t:0.88, fov:28, cp:new THREE.Vector3( 0.0, -0.3, 13.0), ct:new THREE.Vector3(0, -0.3, 0), ry: 0.00, rz: 0.00, rx: 0.00 },
    ];

    function interpKF(p) {
      let i0 = 0, i1 = 1;
      for (let i = 0; i < KF.length - 1; i++) { if (p >= KF[i].t) { i0 = i; i1 = i + 1; } }
      i1 = Math.min(i1, KF.length - 1);
      const k0 = KF[i0], k1 = KF[i1], span = k1.t - k0.t;
      const f  = span > 0 ? ss5(clamp((p - k0.t) / span, 0, 1)) : (p >= k1.t ? 1 : 0);
      const V  = (a, b) => new THREE.Vector3(lerp(a.x,b.x,f), lerp(a.y,b.y,f), lerp(a.z,b.z,f));
      return {
        cp:  V(k0.cp, k1.cp),
        ct:  V(k0.ct, k1.ct),
        fov: lerp(k0.fov, k1.fov, f),
        ry:  lerp(k0.ry,  k1.ry,  f),
        rz:  lerp(k0.rz,  k1.rz,  f),
        rx:  lerp(k0.rx,  k1.rx,  f),
      };
    }

    // ── Smooth state ─────────────────────────────────────────────
    const S = { cx:0, cy:0.5, cz:13, tx:0, ty:0.4, tz:0, fov:28, ry:0, rz:0, rx:0 };
    let iT = 0, lastT = performance.now(), rawY = 0, smY = 0;
    let mnx = 0, mny = 0, mtx = 0, mty = 0, sv = 0;
    let introLocked = true;
    let rafId;

    const HERO_H = () => window.innerHeight * 7;
    const onScroll = () => { if (!introLocked) rawY = window.scrollY; };
    const onMouse  = e => {
      mnx = (e.clientX / window.innerWidth  - 0.5) * 2;
      mny = (e.clientY / window.innerHeight - 0.5) * 2;
      const p = clamp(smY / HERO_H(), 0, 1);
      if (p > 0.48 && p < 0.62)
        sv = Math.min(sv + (Math.abs(e.movementX) + Math.abs(e.movementY)) * 0.0005, 0.015);
    };
    window.addEventListener('scroll',    onScroll, { passive: true });
    window.addEventListener('mousemove', onMouse);

    // ── GLB load ─────────────────────────────────────────────────
    let racketGroup = null;
    const loadGLB = async () => {
      try {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();
        loader.load(
          '/models/badminton-racket.glb',
          (gltf) => {
            racketGroup = gltf.scene;
            racketGroup.scale.setScalar(2.84);  // 10% smaller than 3.16 for breathing room
            racketGroup.position.set(0, 0.4, 0);
            racketGroup.traverse(child => {
              if (!child.isMesh) return;
              child.castShadow = child.receiveShadow = true;
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach(m => {
                m.emissive = new THREE.Color(0x000000);
                m.emissiveIntensity = 0;
                if (m.metalness !== undefined) m.metalness = Math.min(m.metalness, 0.55);
                if (m.roughness !== undefined) m.roughness = Math.min(m.roughness, 0.45);
                m.needsUpdate = true;
              });
            });
            scene.add(racketGroup);
            // Intro: reveal(0.8s) → hold(1.2s) → fade out in place(0.7s) → done
            setIntroStep(1);
            // step 2 = just hold (no movement)
            setTimeout(() => setIntroStep(2), 2000);
            // step 3 = start fade-out of overlay (hero-intro-out triggers 0.7s CSS fade)
            setTimeout(() => setIntroStep(3), 2800);
            // step 4 = overlay gone, scroll unlocked
            setTimeout(() => {
              setIntroStep(4);
              introLocked = false;
            }, 3500);
          },
          (xhr) => {
            if (xhr.lengthComputable)
              setProgress(Math.round(xhr.loaded / xhr.total * 100));
          },
          (err) => {
            console.warn('GLB failed:', err);
            setIntroStep(4);
            introLocked = false;
          }
        );
      } catch (e) {
        console.warn(e);
        setIntroStep(4);
        introLocked = false;
      }
    };
    loadGLB();

    // ── RAF loop ──────────────────────────────────────────────────
    function frame(now) {
      rafId = requestAnimationFrame(frame);
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now; iT += dt;

      smY = exd(smY, rawY, 9, dt);
      const p  = clamp(smY / HERO_H(), 0, 1);
      const kf = interpKF(p);

      const KC = 5.0, KR = 4.8;
      S.cx  = exd(S.cx,  kf.cp.x, KC, dt);
      S.cy  = exd(S.cy,  kf.cp.y, KC, dt);
      S.cz  = exd(S.cz,  kf.cp.z, KC, dt);
      S.tx  = exd(S.tx,  kf.ct.x, KC, dt);
      S.ty  = exd(S.ty,  kf.ct.y, KC, dt);
      S.tz  = exd(S.tz,  kf.ct.z, KC, dt);
      S.fov = exd(S.fov, kf.fov,  KC, dt);
      S.ry  = exd(S.ry,  kf.ry,   KR, dt);
      S.rz  = exd(S.rz,  kf.rz,   KR, dt);
      S.rx  = exd(S.rx,  kf.rx,   KR, dt);

      const rest   = clamp(1 - Math.abs(rawY - smY) * 0.002, 0, 1);
      const floatY = Math.sin(iT * 0.52) * 0.03 * rest;
      const bRz    = Math.sin(iT * 0.37) * 0.008 * rest;
      const bRy    = Math.sin(iT * 0.29) * 0.006 * rest;
      sv *= 0.925;
      const svRz = sv > 0.001 ? Math.sin(iT * 34) * sv : 0;
      const mFade = clamp(1 - p * 18, 0, 1);
      mtx = lerp(mtx, mnx * 0.06 * mFade, 0.035);
      mty = lerp(mty, mny * 0.04 * mFade, 0.035);

      if (racketGroup) {
        racketGroup.rotation.y = S.ry + bRy + mtx;
        racketGroup.rotation.z = S.rz + bRz + svRz;
        racketGroup.rotation.x = S.rx + mty;
        // Shift model down so head clears fixed navbar (~58px safe zone)
        racketGroup.position.y = -0.3 + floatY;
      }

      camera.position.set(S.cx, S.cy, S.cz);
      // On a narrow/tall viewport (phones), the horizontal frustum of a
      // perspective camera is squeezed by the low aspect ratio, cropping
      // the racket's silhouette at the edges even though vertical framing
      // looks fine. Compensating with extra FOV only when aspect is
      // narrow fixes that without touching any keyframe, timing, or
      // desktop camera value — aspect >= 0.9 gets zero adjustment.
      const heroAspect = window.innerWidth / window.innerHeight;
      const mobileFovBoost = heroAspect < 0.9 ? clamp((0.9 - heroAspect) / 0.5, 0, 1) * 12 : 0;
      camera.fov = S.fov + mobileFovBoost;
      camera.updateProjectionMatrix();
      camera.lookAt(S.tx, S.ty, S.tz);

      keyLight.position.set(-4 + S.cx * 0.08, 8, 5 + S.cz * 0.04);
      accentLight.position.set(
        S.cx * 0.35 + Math.sin(iT * 0.28) * 1.8,
        S.cy * 0.3  + 3,
        S.cz * 0.3  + Math.cos(iT * 0.28) * 1.8
      );

      renderer.render(scene, camera);

      // Hero fade-out as sections appear
      if (canvasRef.current) {
        const pv = p > 0.88 ? (1 - ss5((p - 0.88) / 0.12) * 0.96) : 1;
        canvasRef.current.style.opacity = pv;
      }

      // ── Bridge to React: sync active scene ───────────────────
      // Call via syncSceneRef so it doesn't close over stale state
      if (syncSceneRef.current) syncSceneRef.current(p);
    }
    rafId = requestAnimationFrame(frame);

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll',    onScroll);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize',    onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────
  // Scene 0 is the first thing a visitor sees — CMS overrides (Content
  // Management → Homepage → Hero Title/Subtitle) apply only to its text,
  // falling back to the original copy if nothing's set. Scene-switching,
  // timing, and the 3D rendering itself are untouched — this only swaps
  // which string gets displayed for the identical position/transition.
  const sc = activeScene >= 0
    ? (activeScene === 0 && heroText ? { ...SCENES[0], ...heroText } : SCENES[activeScene])
    : null;

  return (
    <div className="hero-root">
      {/* Architectural court-line background — sits behind the canvas
          (first in DOM, no z-index, canvas has none either so later
          DOM order wins the stacking). Pure decoration: doesn't touch
          the Three.js scene, camera, or animation in any way. */}
      <div className="hero-court-lines" aria-hidden="true">
        <svg viewBox="0 0 1340 610" preserveAspectRatio="xMidYMid meet">
          <rect x="8" y="8" width="1324" height="594" />
          <line x1="8" y1="54" x2="1332" y2="54" />
          <line x1="8" y1="556" x2="1332" y2="556" />
          <line x1="670" y1="8" x2="670" y2="602" className="hero-court-net" />
          <line x1="84" y1="8" x2="84" y2="602" />
          <line x1="1256" y1="8" x2="1256" y2="602" />
          <line x1="472" y1="54" x2="472" y2="556" />
          <line x1="868" y1="54" x2="868" y2="556" />
          <line x1="670" y1="54" x2="670" y2="282" />
          <line x1="670" y1="328" x2="670" y2="556" />
        </svg>
      </div>

      {/* Three.js canvas mount */}
      <div ref={mountRef} className="hero-canvas-mount" />

      {/* ── Intro overlay ───────────────────────────────────────── */}
      <div className={`hero-intro
        ${introStep >= 3 ? 'hero-intro-out' : ''}
        ${introStep >= 4 ? 'hero-intro-gone' : ''}
      `}>
        {introStep === 0 && (
          <div className="hero-loading">
            <div className="hero-loading-brand">
              <img src="/logo-r-monogram.png" alt="RacquetIn" className="hero-loading-logo-img" />
            </div>
            <div className="hero-loading-track">
              <div className="hero-loading-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="hero-loading-pct">
              {progress < 100 ? `Loading ${progress}%` : 'Preparing...'}
            </div>
          </div>
        )}
        {introStep >= 1 && introStep < 4 && (
          <div className={`hero-intro-logo
            ${introStep >= 1 ? 'hero-logo-reveal' : ''}
            ${introStep >= 3 ? 'hero-logo-exit'   : ''}
          `}>
            <img src="/logo-r-monogram.png" alt="RacquetIn" className="hero-intro-logo-img" />
          </div>
        )}
      </div>

      {/* ── Active scene text — ONE at a time via AnimatePresence ── */}
      {introStep >= 4 && (
        <AnimatePresence mode="wait">
          {sc && (
            <motion.div
              key={activeScene}
              className={`hero-sp hero-sp-${sc.pos}`}
              variants={sceneVariants}
              initial="initial"
              animate="enter"
              exit="exit"
            >
              <div className="hero-ey">{sc.ey}</div>
              <div className={`hero-h ${sc.pos === 'cc' ? 'hero-h-xl' : ''}`}>
                {sc.h1}<br />{sc.h2}
              </div>
              {sc.body && <p className="hero-body">{sc.body}</p>}
              {sc.spec && (
                <div className="hero-spec">
                  <div className="hero-spec-k">{sc.spec.k}</div>
                  <div className="hero-spec-v">{sc.spec.v}</div>
                </div>
              )}
              {sc.pos === 'cc' && (
                <div className="hero-ctas">
                  <Link
                    to="/rackets"
                    className="hero-cta-btn hero-cta-primary"
                  >
                    {heroCta || 'Shop Now'}
                  </Link>
                  <Link
                    to="/about"
                    className="hero-cta-btn hero-cta-outline"
                  >
                    Our Story
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Scene progress dots */}
      {introStep >= 4 && (
        <div className="hero-dots">
          {SCENES.map((_, i) => (
            <div
              key={i}
              className={`hero-dot ${activeScene === i ? 'hero-dot-on' : ''}`}
            />
          ))}
        </div>
      )}


      {/* Featured Product panel — Apple/Dyson/Leica product-launch style,
          top-left (empty quadrant during scene 0, which uses bottom-right).
          Only shown during the opening scene — the feature scenes that
          follow already carry their own text in varying positions, and
          showing this alongside them risks crowding or overlap. */}
      <AnimatePresence>
        {introStep >= 4 && activeScene === 0 && (
          <motion.div
            className="hero-feature-badge"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .6, delay: .3, ease: [.16, 1, .3, 1] }}
          >
            <div className="hero-feature-eyebrow">Featured</div>
            <div className="hero-feature-tag">Interactive 3D Showcase</div>
            <div className="hero-feature-name">Performance, By Design</div>
            <div className="hero-feature-sub">The engineering behind every RacquetIn racket</div>
            <div className="hero-feature-cta">Explore in full 3D.</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interaction guidance — fades on its own after 6s, or immediately
          on the visitor's first mouse move / touch / scroll (see the
          effect above). Reduced-motion visitors still get the hint text,
          just without the floating icon animation. */}
      <AnimatePresence>
        {introStep >= 4 && activeScene === 0 && showHint && (
          <motion.div
            className="hero-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .4 }}
          >
            <svg className={`hero-hint-icon-desktop ${prefersReducedMotion ? '' : 'hero-hint-icon-animate'}`} width="20" height="28" viewBox="0 0 20 28" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="18" height="26" rx="9" stroke="currentColor" strokeWidth="1.4" />
              <rect className="hero-hint-icon-dot" x="8.5" y="6" width="3" height="7" rx="1.5" fill="currentColor" />
            </svg>
            <svg className={`hero-hint-icon-mobile ${prefersReducedMotion ? '' : 'hero-hint-icon-swipe'}`} width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden="true">
              <path d="M2 10h20M22 10l-5-5M22 10l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="hero-hint-text-desktop">
              <strong>Interactive 3D Experience</strong>
              <span>Move your mouse to explore · Drag to rotate · Scroll to continue</span>
            </div>
            <div className="hero-hint-text-mobile">Swipe to explore the racket</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip to Categories — rendered from mount (not gated on introStep)
          and given a higher z-index than .hero-intro's loading overlay
          (z-index:50) specifically so it stays clickable even while the
          GLB is still loading. Fades out once the visitor scrolls past
          the opening scene, since the feature scenes' own text already
          occupies this general area from here on. */}
      <button
        type="button"
        className={`hero-skip-btn ${activeScene > 0 ? 'hero-skip-hidden' : ''}`}
        onClick={handleSkipToCategories}
      >
        Skip to Categories <span aria-hidden="true">↓</span>
      </button>

      {/* Vignette */}
      <div className="hero-vignette" />


      <style>{`
        /* ── Root ──────────────────────────────────────────── */
        .hero-root {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: #fff;
        }
        .hero-canvas-mount {
          position: absolute;
          inset: 0;
        }

        /* ── Architectural court-line background ──────────────────
           Extremely subtle by design: thin black strokes at very low
           opacity, centered and scaled to the viewport, fading softly
           at the edges via a radial mask so it reads as depth rather
           than a decorative box. Meant to only be noticed on a second
           look — never competes with the racket or the text. */
        .hero-court-lines {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          -webkit-mask-image: radial-gradient(ellipse 68% 62% at 50% 50%, #000 55%, transparent 100%);
          mask-image: radial-gradient(ellipse 68% 62% at 50% 50%, #000 55%, transparent 100%);
        }
        .hero-court-lines svg {
          width: min(92vw, 1340px);
          height: auto;
          overflow: visible;
        }
        .hero-court-lines svg rect,
        .hero-court-lines svg line {
          fill: none;
          stroke: var(--cr);
          stroke-width: 1;
          vector-effect: non-scaling-stroke;
          opacity: 0.058;
        }
        .hero-court-lines svg .hero-court-net {
          opacity: 0.09;
        }
        @media (max-width: 640px) {
          .hero-court-lines svg { width: min(140vw, 900px); }
        }

        /* ── Intro ─────────────────────────────────────────── */
        .hero-intro {
          position: absolute; inset: 0; z-index: 50;
          background: #fff;
          display: flex; align-items: center; justify-content: center;
          transition: opacity .7s ease;
          pointer-events: all;
        }
        .hero-intro-out  { opacity: 0; pointer-events: none; }
        .hero-intro-gone { display: none; }

        .hero-loading {
          display: flex; flex-direction: column; align-items: center;
        }
        .hero-loading-brand {
          display: flex; align-items: center; justify-content: center; margin-bottom: 36px;
        }
        .hero-loading-logo-img {
          width: 64px; height: 64px; object-fit: contain; display: block;
        }
        .hero-loading-track {
          width: 180px; height: 1px; background: rgba(0,0,0,.1);
        }
        .hero-loading-fill {
          height: 100%; background: var(--cr); transition: width .2s ease;
        }
        .hero-loading-pct {
          font-size: 10px; letter-spacing: .2em; text-transform: uppercase;
          color: #999; margin-top: 12px;
        }

        /* ── Logo intro — appears centered, dissolves in place ── */
        .hero-intro-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          filter: blur(8px);
          transform: scale(.94);
          transition: none;
          user-select: none;
        }
        .hero-intro-logo-img {
          width: clamp(80px, 14vw, 160px);
          height: clamp(80px, 14vw, 160px);
          object-fit: contain;
          display: block;
        }
        /* Phase 1: fade + unblur in center */
        .hero-logo-reveal {
          opacity: 1;
          filter: blur(0);
          transform: scale(1);
          transition:
            opacity   .8s cubic-bezier(.16,1,.3,1),
            filter    .8s cubic-bezier(.16,1,.3,1),
            transform .8s cubic-bezier(.16,1,.3,1);
        }
        /* Phase 3: dissolve out in center — no movement */
        .hero-logo-exit {
          opacity: 0;
          filter: blur(6px);
          transform: scale(1.03);
          transition:
            opacity   .7s cubic-bezier(.4,0,.2,1),
            filter    .7s cubic-bezier(.4,0,.2,1),
            transform .7s cubic-bezier(.4,0,.2,1);
        }

        /* ── Safe-zone layout ──────────────────────────────────
           top:    ≥ 120px  (navbar safe area)
           left/right: ≥ 6vw
           bottom: ≥ 80px
        ─────────────────────────────────────────────────────── */
        .hero-sp {
          position: absolute;
          z-index: 10;
          pointer-events: none;
        }

        /* Scene 0 — opening copy anchored to the bottom-right, Apple
           product-launch style: the racket (vertically centered, large)
           remains the dominant visual element, with the headline sitting
           clear of it in its own quadrant. Text size/weight and the 3D
           framing/camera are unchanged — only this anchor point moved. */
        .hero-sp-bc {
          bottom: clamp(90px, 14%, 150px);
          right: clamp(24px, 6vw, 100px);
          left: auto;
          text-align: right;
          width: min(440px, 74vw);
        }

        /* Scene 1 — left-middle */
        .hero-sp-lm {
          left: 6vw;
          top: 50%;
          transform: translateY(-50%);
          max-width: min(280px, 36vw);
        }

        /* Scene 2 — lower-right */
        .hero-sp-rl {
          right: 6vw;
          bottom: clamp(80px, 18%, 160px);
          max-width: min(280px, 36vw);
          text-align: right;
        }

        /* Scene 3 — upper-right (below navbar: top ≥ 120px) */
        .hero-sp-rh {
          right: 6vw;
          top: clamp(120px, 18%, 200px);
          max-width: min(280px, 36vw);
          text-align: right;
        }

        /* Scene 4 — right-middle */
        .hero-sp-rm {
          right: 6vw;
          top: 50%;
          transform: translateY(-50%);
          max-width: min(260px, 34vw);
          text-align: right;
        }

        /* Scene 5 — dead center */
        .hero-sp-cc {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          width: min(520px, 78vw);
        }
        @media (max-width: 640px) {
          /* The final centered scene ("Your Game. Engineered.") stacks
             eyebrow + two headline lines + body + CTA buttons, vertically
             centered — on a short mobile viewport that full stack can
             exceed the visible height and get clipped by .hero-root's
             overflow:hidden. Tightening vertical spacing (never font
             size — typography is untouched) keeps the whole block
             comfortably inside the viewport on small phones. */
          .hero-sp-cc { width: min(300px, 82vw); }
          .hero-sp-cc .hero-body { margin-top: 6px; }
          .hero-sp-cc .hero-ctas { margin-top: 16px; gap: 8px; }
        }

        /* ── Text styles ───────────────────────────────────── */
        .hero-ey {
          font-size: clamp(9px, 0.75vw, 11px);
          font-weight: 600;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--cr);
          margin-bottom: 10px;
        }

        .hero-h {
          font-size: clamp(20px, 2.8vw, 38px);
          font-weight: 700;
          letter-spacing: -.03em;
          text-transform: uppercase;
          line-height: .92;
          color: #0d0d0d;
        }
        .hero-h-xl {
          font-size: clamp(30px, 5.2vw, 68px);
        }

        .hero-body {
          font-size: clamp(12px, 1.1vw, 15px);
          color: #555;
          line-height: 1.65;
          margin-top: 10px;
        }

        .hero-spec {
          margin-top: 16px;
          padding-top: 12px;
          border-top: .5px solid rgba(0,0,0,.1);
        }
        .hero-spec-k {
          font-size: clamp(9px, 0.7vw, 11px);
          letter-spacing: .18em;
          text-transform: uppercase;
          color: #999;
        }
        .hero-spec-v {
          font-size: clamp(22px, 3.2vw, 40px);
          font-weight: 700;
          letter-spacing: -.04em;
          margin-top: 2px;
        }

        /* Scene 5 CTAs */
        .hero-ctas {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 28px;
          pointer-events: all;
        }
        .hero-cta-btn {
          padding: 11px 26px;
          font-size: clamp(10px, 0.85vw, 12px);
          font-weight: 600;
          letter-spacing: .1em;
          text-transform: uppercase;
          border-radius: 3px;
          transition: all .22s cubic-bezier(.16,1,.3,1);
        }
        .hero-cta-primary {
          background: #0d0d0d;
          color: #fff;
          border: 1.5px solid #0d0d0d;
        }
        .hero-cta-primary:hover {
          background: var(--cr);
          border-color: var(--cr);
        }
        .hero-cta-outline {
          background: transparent;
          color: #0d0d0d;
          border: 1.5px solid rgba(0,0,0,.2);
        }
        .hero-cta-outline:hover {
          background: #0d0d0d;
          color: #fff;
          border-color: #0d0d0d;
        }

        /* ── Progress dots ────────────────────────────────── */
        .hero-dots {
          position: absolute;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 10;
        }
        .hero-dot {
          width: 3px; height: 3px;
          border-radius: 50%;
          background: rgba(0,0,0,.2);
          transition: all .35s;
        }
        .hero-dot-on {
          background: var(--cr);
          transform: scale(1.9);
        }

        /* ── Featured Product badge ───────────────────────────── */
        .hero-feature-badge {
          position: absolute;
          /* Bottom-right, same corner as the scene-0 heading below it
             (.hero-sp-bc) — stacked well clear above it (that block
             tops out around 90-150px + its own ~120px of text, so
             270px+ keeps a comfortable gap at every viewport height)
             rather than overlapping it. */
          bottom: clamp(270px, 34vh, 360px);
          right: clamp(24px, 6vw, 100px);
          z-index: 12;
          max-width: min(320px, 70vw);
          text-align: right;
          pointer-events: none;
        }
        .hero-feature-eyebrow {
          font-size: 10px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase;
          color: var(--cr); margin-bottom: 8px;
        }
        .hero-feature-tag {
          font-size: 11px; font-weight: 500; letter-spacing: .04em; color: var(--gr-2); margin-bottom: 4px;
        }
        .hero-feature-name {
          font-size: clamp(18px, 1.8vw, 24px); font-weight: 700; letter-spacing: -.02em; color: var(--bk); line-height: 1.15;
        }
        .hero-feature-sub {
          font-size: 12px; color: var(--gr-2); margin-top: 4px;
        }
        .hero-feature-cta {
          font-size: 12px; color: var(--gr-1); margin-top: 12px; font-style: italic;
        }
        @media (max-width: 640px) {
          /* Below 640px .hero-sp-bc is hidden entirely (see that media
             query further down), so the corner is free and the badge
             can sit at the same comfortable distance from the bottom
             that heading used to use — no stacking math needed here. */
          .hero-feature-badge { bottom: clamp(80px, 12%, 130px); right: 20px; max-width: 62vw; }
          .hero-feature-name { font-size: 16px; }
        }

        /* ── Interaction hint ─────────────────────────────────── */
        .hero-hint {
          position: absolute;
          bottom: 92px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 12;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          background: rgba(255,255,255,.78);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 999px;
          pointer-events: none;
          white-space: nowrap;
        }
        .hero-hint-text-desktop { display: flex; flex-direction: column; gap: 1px; }
        .hero-hint-text-desktop strong { font-size: 11px; font-weight: 600; color: var(--bk); }
        .hero-hint-text-desktop span { font-size: 10.5px; color: var(--gr-2); }
        .hero-hint-text-mobile { display: none; font-size: 11px; font-weight: 600; color: var(--bk); }
        .hero-hint-icon-mobile { display: none; }
        .hero-hint-icon-desktop, .hero-hint-icon-mobile { color: var(--gr-1); flex-shrink: 0; }
        .hero-hint-icon-animate .hero-hint-icon-dot { animation: hero-hint-scroll 1.6s ease-in-out infinite; }
        @keyframes hero-hint-scroll { 0%,100% { transform: translateY(0); opacity:1; } 50% { transform: translateY(5px); opacity:.4; } }
        .hero-hint-icon-swipe { animation: hero-hint-swipe 1.6s ease-in-out infinite; }
        @keyframes hero-hint-swipe { 0%,100% { transform: translateX(0); opacity:1; } 50% { transform: translateX(4px); opacity:.5; } }
        @media (max-width: 860px) {
          .hero-hint { bottom: 78px; padding: 9px 16px; }
          .hero-hint-text-desktop { display: none; }
          .hero-hint-text-mobile { display: block; }
          .hero-hint-icon-desktop { display: none; }
          .hero-hint-icon-mobile { display: block; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-hint-icon-dot, .hero-hint-icon-swipe { animation: none; }
        }

        /* ── Skip to Categories ───────────────────────────────── */
        .hero-skip-btn {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 60; /* above .hero-intro (z-index:50) so it's clickable even while the GLB is still loading */
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: var(--bk);
          color: var(--wh);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: .02em;
          border-radius: 999px;
          box-shadow: 0 4px 16px rgba(0,0,0,.18);
          transition: opacity .4s ease, transform .4s ease, background .2s ease;
          pointer-events: all;
        }
        .hero-skip-btn:hover { background: var(--cr); }
        .hero-skip-btn:focus-visible { outline: 2px solid var(--cr); outline-offset: 3px; }
        .hero-skip-hidden { opacity: 0; transform: translateX(-50%) translateY(8px); pointer-events: none; }
        @media (max-width: 860px) {
          .hero-skip-btn { bottom: 22px; padding: 9px 16px; font-size: 11px; }
        }

        /* ── Vignette ─────────────────────────────────────── */
        .hero-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(
            ellipse 88% 88% at 50% 50%,
            transparent 52%,
            rgba(255,255,255,.28) 100%
          );
          pointer-events: none;
          z-index: 5;
        }

        @media (max-width: 640px) {
          /* lm/rm are vertically centered in their base rule via
             translateY(-50%) (see .hero-sp-lm / .hero-sp-rm above).
             transform is not additive across rules — a mobile override
             that only set translateX(-50%) here would silently replace
             that Y-centering and leave the block sitting too low.
             rl/rh don't use translateY (they're anchored via top/bottom
             instead), so they only ever needed the X half. */
          .hero-sp-lm, .hero-sp-rm {
            left: 50%; right: auto;
            transform: translate(-50%, -50%);
            text-align: center;
            max-width: 80vw;
          }
          .hero-sp-rl, .hero-sp-rh {
            left: 50%; right: auto;
            transform: translateX(-50%);
            text-align: center;
            max-width: 80vw;
          }
          /* Scene 0's own headline ("Engineered / for Speed") said the
             same thing the Featured Product badge already says — on a
             small screen the two blocks stacked on top of each other
             and crowded the racket. The badge is now the single
             overlay for this scene on mobile; nothing else about the
             scene (its timing, the camera, or the dots below) changes. */
          .hero-sp-bc { display: none; }
        }
      `}</style>
    </div>
  );
}

// ── Category grid ─────────────────────────────────────────────────
const CATEGORIES = [
  { label: 'Rackets',      slug: 'rackets',      href: '/rackets',      desc: 'Performance engineering for every level', color: '#111',   image: '/images/categories/rackets-cover.jpg' },
  { label: 'Shoes',        slug: 'shoes',        href: '/shoes',        desc: 'Court-optimised footwear',                color: '#1a2a1a', image: '/images/categories/shoes-cover.jpg' },
  { label: 'Bags',         slug: 'bags',         href: '/bags',         desc: 'Carry your kit in style',                 color: '#1a1a2a', image: '/images/categories/bags-cover.jpg' },
  { label: 'Shuttlecocks', slug: 'shuttlecocks', href: '/shuttlecocks', desc: 'Tournament to training',                  color: '#2a1a1a', image: '/images/categories/shuttlecocks-cover.jpg' },
  { label: 'Strings',      slug: 'strings',      href: '/strings',      desc: 'Power, control & durability',             color: '#23231a', image: '/images/categories/strings-cover.jpg' },
  { label: 'Grips',        slug: 'grips',        href: '/grips',        desc: 'Comfort, tack & feel',                    color: '#1a1f2a', image: '/images/categories/grips-cover.jpg' },
  { label: 'Apparel',      slug: 'apparel',      href: '/apparel',      desc: 'Match kit & essentials',                  color: '#1a2a2a', image: '/images/categories/apparel-cover.jpg' },
];

function CollectionsGrid() {
  const [counts, setCounts] = useState({}); // { slug: count }
  useEffect(() => {
    let cancelled = false;
    fetchCategoryCounts(CATEGORIES.map(c => c.slug))
      .then(({ data }) => { if (!cancelled) setCounts(data || {}); })
      .catch(() => { /* leave counts empty — cards just omit the count line below */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="section" id="categories" style={{ scrollMarginTop: 84 }}>
      <div className="container">
        <div className="section-header">
          <div className="section-header-left">
            <div className="eyebrow">Collections</div>
            <h2 className="t-h2">Shop by Category</h2>
          </div>
        </div>
        <div className="cc-grid">
          {CATEGORIES.map((cat, i) => {
            const count = counts[cat.slug];
            return (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: .5, delay: i * .06 }}
              >
                <Link to={cat.href} className="cc-card">
                  <div className="cc-media">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.label} loading="lazy" />
                    ) : (
                      <div className="cc-media-placeholder" style={{ background: cat.color }} />
                    )}
                  </div>
                  <div className="cc-body">
                    <div className="cc-top">
                      <h3 className="cc-name">{cat.label}</h3>
                      {count !== undefined && (
                        <span className="cc-count">{count} {count === 1 ? 'Item' : 'Items'}</span>
                      )}
                    </div>
                    <p className="cc-desc">{cat.desc}</p>
                    <span className="cc-cta">
                      Explore Collection
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
      <style>{`
        .cc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 28px;
        }
        .cc-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--wh);
          border: 1px solid var(--gr-5);
          border-radius: var(--r);
          overflow: hidden;
          box-shadow: var(--shadow);
          transition: box-shadow .4s cubic-bezier(.16,1,.3,1), transform .4s cubic-bezier(.16,1,.3,1), border-color .4s;
        }
        .cc-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-3px);
          border-color: var(--gr-4);
        }
        .cc-media {
          aspect-ratio: 4 / 5;
          overflow: hidden;
          background: var(--gr-6);
        }
        .cc-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          transition: transform .6s cubic-bezier(.16,1,.3,1);
        }
        .cc-card:hover .cc-media img { transform: scale(1.05); }
        .cc-media-placeholder { width: 100%; height: 100%; }
        .cc-body { padding: 22px 24px 26px; display: flex; flex-direction: column; flex: 1; }
        .cc-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
        .cc-name { font-size: clamp(16px, 1.3vw, 19px); font-weight: 700; letter-spacing: -.02em; color: var(--bk); }
        .cc-count { font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--gr-2); white-space: nowrap; flex-shrink: 0; }
        .cc-desc {
          font-size: 13px; color: var(--gr-1); line-height: 1.5; margin-bottom: 16px;
          /* Fixed to exactly 2 lines regardless of actual text length —
             descriptions of varying length were giving each category
             card a different natural height, which threw off the grid
             row heights and made the images (and cards) beside each
             other look misaligned. Every card's body is now the same
             height no matter how short or long its description is. */
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: calc(13px * 1.5 * 2);
        }
        .cc-cta { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; letter-spacing: .01em; color: var(--cr); margin-top: auto; }
        .cc-cta svg { transition: transform .3s cubic-bezier(.16,1,.3,1); }
        .cc-card:hover .cc-cta svg { transform: translateX(3px); }
        @media(max-width:540px){ .cc-grid { grid-template-columns: 1fr 1fr; gap: 16px; } .cc-body { padding: 16px 16px 18px; } }
        @media(max-width:380px){ .cc-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
}

function BestSellers() {
  const [products, setProducts] = useState(null); // null = loading
  useEffect(() => {
    let cancelled = false;
    fetchBestSellers(6)
      .then(({ data }) => { if (!cancelled) setProducts(normalizeProducts(data)); })
      .catch(() => { if (!cancelled) setProducts([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="section" style={{ background: 'var(--gr-6)' }}>
      <div className="container">
        <div className="section-header">
          <div className="section-header-left">
            <div className="eyebrow">Performance Proven</div>
            <h2 className="t-h2">Best Sellers</h2>
          </div>
          <Link to="/rackets" className="btn btn-outline btn-sm">View All</Link>
        </div>
        {products === null ? (
          <p className="t-body">Loading…</p>
        ) : (
          <div className="grid-4">
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function NewArrivals() {
  const [products, setProducts] = useState(null); // null = loading
  useEffect(() => {
    let cancelled = false;
    fetchNewArrivals(6)
      .then(({ data }) => { if (!cancelled) setProducts(normalizeProducts(data)); })
      .catch(() => { if (!cancelled) setProducts([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div className="section-header-left">
            <div className="eyebrow">Just Landed</div>
            <h2 className="t-h2">New Arrivals</h2>
          </div>
          <Link to="/rackets" className="btn btn-outline btn-sm">View All</Link>
        </div>
        {products === null ? (
          <p className="t-body">Loading…</p>
        ) : (
          <div className="grid-4">
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function TechStrip() {
  // Same four performance themes the hero's scroll scenes now showcase
  // (see SCENES above) — copy reused verbatim so this section reads as
  // a continuation of the hero rather than a separate list. These are
  // positioned as principles represented across the RacquetIn racket
  // range, not specs of one named model — no brand or model name here,
  // consistent with the hero above.
  const techs = [
    { name: 'Performance Grip',    desc: 'Confident handling, stable feedback, and precise shot control through every rally.',           icon: '01' },
    { name: 'Graphite Construction', desc: 'Stability, responsiveness, and efficient energy transfer without unnecessary bulk.',           icon: '02' },
    { name: 'Precision String Bed', desc: 'Clean impact, controlled touch, and consistent shuttle feedback.',                              icon: '03' },
    { name: 'Aerodynamic Frame',   desc: 'Reduced air resistance for quicker swings and faster recovery between shots.',                    icon: '04' },
  ];
  return (
    <section className="section" style={{ background: 'var(--bk)', color: '#fff' }}>
      <div className="container">
        <div className="section-header">
          <div className="section-header-left">
            <div className="eyebrow" style={{ color: 'var(--cr)' }}>Innovation</div>
            <h2 className="t-h2" style={{ color: '#fff' }}>Built Different</h2>
          </div>

        </div>
        <div className="tech-strip-grid">
          {techs.map((t, i) => (
            <motion.div
              key={t.name}
              className="tech-strip-item"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: .5, delay: i * .1 }}
            >
              <div className="tech-strip-num">{t.icon}</div>
              <div className="tech-strip-name">{t.name}</div>
              <div className="tech-strip-desc">{t.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
      <style>{`
        .tech-strip-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:rgba(255,255,255,.06); }
        .tech-strip-item { padding:32px 28px; border-top:1px solid rgba(255,255,255,.06); }
        .tech-strip-num { font-size:11px; font-weight:700; letter-spacing:.18em; color:var(--cr); margin-bottom:16px; font-family:var(--fm); }
        .tech-strip-name { font-size:clamp(12px,1vw,14px); font-weight:700; text-transform:uppercase; letter-spacing:-.01em; margin-bottom:10px; }
        .tech-strip-desc { font-size:clamp(12px,0.95vw,13.5px); color:rgba(255,255,255,.4); line-height:1.65; }
        @media(max-width:860px){ .tech-strip-grid{grid-template-columns:1fr 1fr;} }
        @media(max-width:540px){ .tech-strip-grid{grid-template-columns:1fr;} }
      `}</style>
    </section>
  );
}

// ── Personalised Racket Finder ──────────────────────────────────────
// Real recommendation engine (src/utils/racketFinder.js) scored against
// the actual racket catalogue — via the product API layer, which uses
// Supabase when configured and falls back to local product data
// automatically. No hardcoded results.

const FINDER_QUESTIONS = [
  { key: 'level', q: 'What\'s your skill level?', opts: ['Beginner', 'Intermediate', 'Advanced', 'Professional'] },
  { key: 'style', q: 'How would you describe your playing style?', opts: ['Attacking', 'Defensive', 'All-round', 'Fast doubles', 'Control'] },
  { key: 'feel', q: 'What racket feel do you prefer?', opts: ['Head-Heavy', 'Even Balance', 'Head-Light'] },
  { key: 'flex', q: 'Shaft flex preference?', opts: ['Flexible', 'Medium', 'Stiff', 'Extra Stiff'] },
  { key: 'budget', q: 'What\'s your budget?', opts: BUDGET_RANGES.map(r => r.label), values: BUDGET_RANGES.map(r => r.key) },
  { key: 'focus', q: 'Singles or doubles focus?', opts: ['Singles', 'Doubles', 'Both'] },
];

function RacketFinder() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [rackets, setRackets] = useState(null); // null = loading
  const { addItem } = useCart();
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchProducts({ category: 'rackets', limit: 100 }).then(({ data }) => {
      if (!cancelled) setRackets(normalizeProducts(data));
    }).catch(() => {
      // Genuine fetch failure (e.g. network down) — show the existing
      // "couldn't find a match" empty state below rather than ever
      // substituting old local/mock racket data, which could show a
      // product that's since been renamed, discontinued, or repriced.
      if (!cancelled) setRackets([]);
    });
    return () => { cancelled = true; };
  }, []);

  const results = step >= FINDER_QUESTIONS.length && rackets
    ? recommendRackets(answers, rackets, 3)
    : [];

  const handleAnswer = (key, value) => {
    setAnswers(a => ({ ...a, [key]: value }));
    setStep(s => s + 1);
  };

  const handleAddToCart = (product) => {
    addItem(product, { color: product.colors?.[0] });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1800);
  };

  const isQuiz = step < FINDER_QUESTIONS.length;
  const question = FINDER_QUESTIONS[step];

  return (
    <section className="section" style={{ background: 'var(--gr-6)' }}>
      <div className={isQuiz ? 'container-sm' : 'container'}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>Personalised</div>
          <h2 className="t-h2">Racket Finder</h2>
          <p className="t-body" style={{ marginTop: 12 }}>
            Answer a few quick questions and we'll match you against the current racket range.
          </p>
        </div>

        {isQuiz ? (
          <div className="fyr-box">
            <div className="fyr-step">{step + 1} / {FINDER_QUESTIONS.length}</div>
            <div className="fyr-q">{question.q}</div>
            <div className="fyr-opts">
              {question.opts.map((o, i) => (
                <button
                  key={o}
                  className="fyr-opt"
                  onClick={() => handleAnswer(question.key, question.values ? question.values[i] : o)}
                >
                  {o}
                </button>
              ))}
            </div>
            {step > 0 && (
              <button className="fyr-back" onClick={() => setStep(s => s - 1)}>← Back</button>
            )}
          </div>
        ) : rackets === null ? (
          <div className="fyr-box" style={{ textAlign: 'center', maxWidth: 560 }}>
            <p className="t-body">Finding your matches…</p>
          </div>
        ) : results.length === 0 ? (
          <div className="fyr-box" style={{ textAlign: 'center', maxWidth: 560 }}>
            <p className="t-body">We couldn't find a strong match right now — try browsing the full range instead.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              <Link to="/rackets" className="btn btn-primary">Browse Rackets</Link>
              <button className="btn btn-outline" onClick={() => { setStep(0); setAnswers({}); }}>Start Over</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="fyr-results-grid">
              {results.map(({ product, reason }, i) => (
                <div key={product.id} className="fyr-result-card">
                  <div className="fyr-result-rank">{i === 0 ? 'Best Match' : `Match ${i + 1}`}</div>
                  <Link to={`/product/${product.id}`} className="fyr-result-img">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} />
                    ) : (
                      <div className="fyr-result-img-placeholder" />
                    )}
                  </Link>
                  <Link to={`/product/${product.id}`} className="fyr-result-name">{product.name}</Link>
                  <div className="fyr-result-specs">
                    {product.playerLevel} · {product.balance} · {product.flex}
                  </div>
                  <div className="fyr-result-price">{formatPrice(product.price)}</div>
                  <p className="fyr-result-reason">{reason}</p>
                  <div className="fyr-result-actions">
                    <Link to={`/product/${product.id}`} className="btn btn-outline btn-sm">View</Link>
                    <button className="btn btn-primary btn-sm" onClick={() => handleAddToCart(product)}>
                      {addedId === product.id ? 'Added' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button className="btn btn-outline" onClick={() => { setStep(0); setAnswers({}); }}>Start Over</button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        .fyr-box { background:var(--wh); border-radius:var(--r); padding:40px; max-width:560px; margin:0 auto; }
        .fyr-step { font-size:clamp(9px,0.75vw,11px); letter-spacing:.2em; text-transform:uppercase; color:var(--gr-2); margin-bottom:16px; }
        .fyr-q { font-size:clamp(18px,2.5vw,26px); font-weight:700; letter-spacing:-.025em; margin-bottom:24px; }
        .fyr-opts { display:flex; flex-direction:column; gap:10px; }
        .fyr-opt { padding:14px 20px; border:1.5px solid var(--gr-4); border-radius:var(--r-sm); text-align:left; font-size:clamp(13px,1.05vw,15px); font-weight:500; transition:var(--trans); }
        .fyr-opt:hover { border-color:var(--bk); background:var(--bk); color:var(--wh); }
        .fyr-back { margin-top:20px; font-size:12px; color:var(--gr-2); font-weight:500; }
        .fyr-back:hover { color:var(--bk); }

        .fyr-results-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
        .fyr-result-card { background:var(--wh); border-radius:var(--r); padding:24px; display:flex; flex-direction:column; }
        .fyr-result-rank { font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--cr); margin-bottom:14px; }
        .fyr-result-img { display:block; aspect-ratio:1; background:var(--gr-6); border-radius:var(--r-sm); overflow:hidden; margin-bottom:16px; display:flex; align-items:center; justify-content:center; }
        .fyr-result-img img { width:100%; height:100%; object-fit:contain; padding:10%; }
        .fyr-result-img-placeholder { width:100%; height:100%; background:var(--gr-6); }
        .fyr-result-name { font-size:15px; font-weight:700; letter-spacing:-.015em; margin-bottom:4px; }
        .fyr-result-name:hover { color:var(--cr); }
        .fyr-result-specs { font-size:11px; color:var(--gr-2); margin-bottom:8px; }
        .fyr-result-price { font-size:15px; font-weight:700; color:var(--cr); margin-bottom:12px; }
        .fyr-result-reason { font-size:12.5px; color:var(--gr-1); line-height:1.6; margin-bottom:20px; flex:1; }
        .fyr-result-actions { display:flex; gap:8px; }
        .fyr-result-actions .btn { flex:1; }
        @media(max-width:860px){ .fyr-results-grid{grid-template-columns:1fr;} }
      `}</style>
    </section>
  );
}

function BrandEditorial() {
  const { content } = useSiteContent();
  const title = pick(content['homepage.brand_story_title'], 'Built for players who notice the difference.');
  const intro = pick(content['homepage.brand_story_body'], 'RacquetIn started with a straightforward conviction: the equipment most players settle for is rarely the equipment they deserve.');

  return (
    <section className="section brand-editorial">
      <div className="container">
        <div className="be-grid">
          <div className="be-left">
            <div className="eyebrow">Our Approach</div>
            <h2 className="t-h2 be-heading">{title}</h2>
          </div>
          <div className="be-right">
            <p className="be-body">{intro}</p>
            <p className="be-body">
              Every product in the range is chosen for a reason. The frame geometry, the string tension range, the grip texture — these are not defaults. They are decisions, made deliberately, and held to a standard that most equipment categories do not bother with.
            </p>
            <p className="be-body">
              We work with the same material suppliers used in professional sport. We test against performance benchmarks rather than price points. And we present what we make with the same rigour we apply to how it is made.
            </p>
            <p className="be-body">
              Badminton is a precise game. The equipment it demands should be equally precise.
            </p>
            <div className="be-stats">
              <div className="be-stat">
                <div className="be-stat-n">56</div>
                <div className="be-stat-l">Products in range</div>
              </div>
              <div className="be-stat">
                <div className="be-stat-n">7</div>
                <div className="be-stat-l">Categories</div>
              </div>
              <div className="be-stat">
                <div className="be-stat-n">1</div>
                <div className="be-stat-l">Standard</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .brand-editorial { border-top: 1px solid var(--gr-5); border-bottom: 1px solid var(--gr-5); }
        .be-grid { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:start; }
        .be-heading { margin-top:16px; }
        .be-right { padding-top:40px; }
        .be-body { font-size:clamp(14px,1.15vw,16px); color:var(--gr-1); line-height:1.75; margin-bottom:18px; }
        .be-stats { display:flex; gap:40px; margin-top:40px; padding-top:32px; border-top:1px solid var(--gr-5); }
        .be-stat-n { font-size:clamp(28px,3.5vw,44px); font-weight:700; letter-spacing:-.04em; color:var(--cr); }
        .be-stat-l { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--gr-2); margin-top:4px; }
        @media(max-width:860px){ .be-grid{grid-template-columns:1fr; gap:32px;} .be-right{padding-top:0;} }
      `}</style>
    </section>
  );
}

function Newsletter() {
  const { content } = useSiteContent();
  const title = pick(content['homepage.newsletter_title'], 'Get Early Access & Expert Tips');
  const body  = pick(content['homepage.newsletter_body'], 'New drops, string tension guides, athlete stories, and exclusive member offers.');

  return (
    <section className="section" style={{ background: 'var(--cr)' }}>
      <div className="container-sm" style={{ textAlign: 'center' }}>
        <div className="t-label" style={{ color: 'rgba(255,255,255,.7)', marginBottom: 12 }}>
          Join RacquetIn Club
        </div>
        <h2 className="t-h2" style={{ color: '#fff', marginBottom: 16 }}>
          {title}
        </h2>
        <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 'clamp(13px,1.1vw,15px)', marginBottom: 32 }}>
          {body}
        </p>
        <div className="nl-form">
          <input className="input nl-input" placeholder="Enter your email address" />
          <button className="btn btn-primary nl-btn">Subscribe</button>
        </div>
        <p style={{ fontSize: 'clamp(10px,0.8vw,12px)', color: 'rgba(255,255,255,.5)', marginTop: 12 }}>
          No spam. Unsubscribe anytime.
        </p>
      </div>
      <style>{`
        .nl-form { display:flex; gap:8px; max-width:440px; margin:0 auto; }
        .nl-input { background:rgba(255,255,255,.15); border-color:rgba(255,255,255,.3); color:#fff; }
        .nl-input::placeholder { color:rgba(255,255,255,.5); }
        .nl-btn { background:var(--bk); border-color:var(--bk); flex-shrink:0; }
        @media(max-width:540px){ .nl-form{flex-direction:column;} }
      `}</style>
    </section>
  );
}

export default function HomePage() {
  const { content } = useSiteContent();
  const heroTitle = pick(content['homepage.hero_title'], null);
  const heroSubtitle = pick(content['homepage.hero_subtitle'], null);
  const heroCta = pick(content['homepage.hero_cta'], null);
  const heroText = (heroTitle || heroSubtitle) ? {
    h1: heroTitle || SCENES[0].h1,
    h2: heroTitle ? '' : SCENES[0].h2,
    body: heroSubtitle || SCENES[0].body,
  } : null;

  return (
    <div>
      {/* 3D Cinematic Hero — sticky scroll */}
      <div style={{ height: '700vh' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh' }}>
          <HeroCanvas heroText={heroText} heroCta={heroCta} />
        </div>
      </div>

      {/* E-commerce sections */}
      <div style={{ position: 'relative', zIndex: 10, background: '#fff' }}>
        <CollectionsGrid />
        <BestSellers />
        <BrandEditorial />
        <NewArrivals />
        <TechStrip />
        <RacketFinder />
        <Newsletter />
      </div>
    </div>
  );
}
