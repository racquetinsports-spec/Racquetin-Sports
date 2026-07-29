# Homepage Hero — Vertical→Horizontal Interaction Change (Enhanced Brief)

*Enhanced against the actual current implementation, not assumptions. Everything below reflects what's really in `src/pages/HomePage.jsx` today.*

---

## Correction to the original brief's assumed architecture

**There is no GSAP, no ScrollTrigger, and no React Three Fiber anywhere in the hero.** The original brief's audit checklist ("GSAP timelines," "ScrollTrigger configuration," "pinned sections," "scrub values") describes a common pattern for this kind of interaction, but it isn't what's actually here. Whoever implements this should stop looking for those and work with what's real:

- The hero (`HeroCanvas`, inside `HomePage.jsx`) is **raw Three.js** — manual `THREE.Scene`/`THREE.PerspectiveCamera`/`THREE.WebGLRenderer`, not React Three Fiber's `<Canvas>`.
- The animation loop is a **hand-rolled `requestAnimationFrame` loop** (`frame()`), not a GSAP timeline.
- Smoothing is done with a custom exponential-decay helper (`exd(current, target, k, dt)`), not GSAP's easing.
- "Scroll progress" is computed by hand: `const p = clamp(smY / HERO_H(), 0, 1)`.

This isn't a worse architecture to work with than GSAP — if anything it's more directly rewireable, since it's already just numbers being read and written in one place. But it means "use the existing GSAP/R3F architecture" in the original brief doesn't apply; there's nothing there to reuse for that part. The **Lenis and Framer Motion** parts of the stack are real and used elsewhere in the file (Framer Motion drives the scene-text transitions via `AnimatePresence`/`sceneVariants`) — those remain relevant.

---

## The exact, quantified root cause

```jsx
<div style={{ height: '700vh' }}>
  <div style={{ position: 'sticky', top: 0, height: '100vh' }}>
    <HeroCanvas heroText={heroText} heroCta={heroCta} />
  </div>
</div>
```

```js
const HERO_H = () => window.innerHeight * 7;
const onScroll = () => { if (!introLocked) rawY = window.scrollY; };
// ...in the rAF loop:
smY = exd(smY, rawY, 9, dt);
const p = clamp(smY / HERO_H(), 0, 1);
```

The `700vh` wrapper and the `* 7` divisor are the same number, deliberately kept in sync — this is a literal, working scroll-trap: **the visitor must scroll seven full viewport-heights** before `p` reaches 1 and the sticky wrapper releases into the rest of the page (`CollectionsGrid` — see naming note below). Removing the vertical dependency means removing *both* of these together, not just one.

**Naming note:** the original brief calls the section after the hero "Categories." In code it's the `<CollectionsGrid />` component (rendered directly after the hero wrapper) — this is the same section conceptually, just referenced under its actual component name here so implementation notes point at the right place.

---

## The good news: most of the target architecture already exists

The original brief's "Progress Mapping" section asks for exactly this pipeline:

> Horizontal input → normalized target progress → smoothed current progress → existing timeline → rendered GLB state

**That pipeline already exists, end to end, driven by the wrong input.** Concretely:

- **Normalized progress (`p`, 0–1)** — already computed every frame, already clamped, already the single source of truth.
- **Smoothing/damping** — `exd()` already smooths `smY` toward `rawY` with a configurable rate (`9` for position, separate `KC`/`KR` rates for camera and rotation smoothing downstream). The same function can smooth a horizontal-gesture-derived target instead of scroll position — same call signature, different input.
- **Camera keyframes (`KF`, 6 stops)** — already driven purely by `p` via `interpKF(p)`, with its own internal smoothstep easing (`ss5`) between keyframes. Untouched by this change.
- **Scene/text sync (`sceneForProgress(p)`, `SCENE_RANGES`)** — already derives which of the 6 `SCENES` entries is active purely from `p`, bridged into React state via `syncSceneRef.current(p)`. Untouched by this change.
- **Progress dots (`.hero-dots`)** — already render, already reflect `activeScene` (itself derived from `p`). Currently **display-only** — the "allow dragging" part of the original brief's Progress Indicator section is genuinely new work, not something to wire up from existing logic.

**What's genuinely new work:** every input-handling requirement in the original brief (touch gesture detection, trackpad `deltaX`/`deltaY` reading, mouse drag fallback, keyboard arrows, the "swipe/drag to explore" hint). **None of this exists in any form today** — there's exactly one `touchstart` listener in the whole hero, and it's for dismissing an unrelated first-touch hint, not for gesture control. This should be built as a single new input layer whose only job is producing the `rawY`-equivalent target value that already feeds into `exd()` — i.e., the new code should be *narrow*: detect gesture, compute a target progress delta, hand it to the existing smoothing/keyframe/scene pipeline, done. Resist the temptation to also rebuild the camera/scene logic; that part isn't broken.

---

## Two behaviors the original brief doesn't mention, which must be preserved deliberately

**1. The intro lock/reveal sequence.** Before any scroll or interaction is read at all, there's a fixed sequence independent of `p`: GLB loads → reveal (0.8s) → hold (1.2s) → fade out overlay (0.7s) → `introLocked = false` at 3.5s total. This is a *loading choreography*, not part of the scroll-scrub mechanism — the new horizontal input layer should stay inert until `introLocked` is false, exactly like the current scroll listener does (`if (!introLocked) rawY = window.scrollY;`).

**2. Two effects layered on top of `p`, not driven by it.** The idle "breathing" micro-motion (`floatY`, `bRz`, `bRy` — small sine-wave drift keyed to elapsed time `iT`, blended by a `rest` factor measuring how settled the camera currently is) and the desktop mouse-parallax tilt (`mtx`/`mty`, faded out via `mFade` as `p` advances past the very start) are both independent of *how* `p` is being driven. They should keep working unmodified regardless of whether `p` comes from vertical scroll or horizontal gesture — worth an explicit regression check after the input swap, since `rest` is computed from `Math.abs(rawY - smY)`, which is scroll-specific naming that will need renaming/adapting to whatever the new target-vs-smoothed variable pair is called, even though its *purpose* (are we still settling into a new position, or holding steady) carries over unchanged.

---

## Mobile FOV compensation — orthogonal, don't touch

```js
const heroAspect = window.innerWidth / window.innerHeight;
const mobileFovBoost = heroAspect < 0.9 ? clamp((0.9 - heroAspect) / 0.5, 0, 1) * 12 : 0;
```

This exists to stop the racket's silhouette clipping on narrow/tall phone viewports and has nothing to do with scroll vs. horizontal input — flagging it only so it isn't accidentally touched or reset while the surrounding camera code is being edited.

---

## Everything else in the original brief still applies

The device-specific gesture-detection rules (dominant-axis threshold, `touch-action: pan-y` over `none`, passive-listener preference, no forced Shift-scroll, click-drag as the primary mouse fallback, keyboard arrow support, `prefers-reduced-motion` handling, the iOS edge-swipe-back exclusion, and the full responsive/viewport test matrix) are all still exactly the right requirements — none of that needed correcting, only the architecture section above did. This document adds precision to *where* and *how* to make the change; it doesn't change *what* the change should be.

## One open implementation question worth deciding before coding

The original brief lists four acceptable desktop-mouse fallback options (click-drag, visible arrows, draggable progress rail, keyboard) and prefers click-drag "unless the current architecture strongly favors another approach." Given the progress dots already exist and already reflect `p`, making them draggable (option 3) reuses existing UI rather than adding new chrome to the hero — worth weighing against click-drag-on-the-canvas before committing, since both are reasonable and the existing dots make the rail option slightly cheaper to build well.
