export type Theme = "light" | "dark";

const DURATION_MS = 800;
const EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

// One transition at a time: overlapping view transitions each hold a full-page snapshot.
let active: ViewTransition | null = null;
let activeAnim: Animation | null = null;

function apply(next: Theme) {
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch { /* private mode */ }
}

/**
 * Switches theme with a circular clip-path reveal from `origin` (the toggle's centre).
 * Light→dark grows the new (dark) layer; dark→light retraces it by shrinking the old (dark) layer
 * back into the same point. The pseudo-element CSS lives in globals.css.
 */
export async function setThemeWithReveal(next: Theme, origin: { x: number; y: number }) {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("startViewTransition" in document)) return apply(next);

  try { activeAnim?.cancel(); active?.skipTransition(); } catch { /* already settled */ }

  const toDark = next === "dark";
  root.style.setProperty("--reveal-x", `${origin.x}px`);
  root.style.setProperty("--reveal-y", `${origin.y}px`);
  root.dataset.themeTransition = toDark ? "to-dark" : "to-light";

  const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
  const transition = document.startViewTransition(() => apply(next));
  active = transition;
  let own: Animation | null = null;

  transition.finished.finally(() => {
    // A finished fill:both pseudo-element animation would re-attach to the next transition's pseudo tree.
    own?.cancel();
    if (active !== transition) return;
    delete root.dataset.themeTransition;
    active = activeAnim = null;
  });

  try { await transition.ready; } catch { return; } // skipped: theme already applied

  const grow = [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`];
  own = activeAnim = root.animate(
    { clipPath: toDark ? grow : [...grow].reverse() },
    { duration: DURATION_MS, easing: EASING, fill: "both", pseudoElement: toDark ? "::view-transition-new(root)" : "::view-transition-old(root)" },
  );
}
