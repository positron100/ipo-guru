import type { Transition } from "framer-motion";

/**
 * The motion vocabulary. Mirrors the CSS tokens in globals.css (--dur-*, --ease-*); use these (or the CSS variables) instead of literals.
 * Tailwind's duration-150/200/300/500 classes are the same four values. Levels:
 *   1 colour / opacity / tiny transform  ->  micro, interactive
 *   2 interactive movement               ->  springs (below), interactive, transition
 *   3 page / section transition          ->  transition, reveal
 *   4 opening / cinematic                ->  cinematic
 * Do not stack levels on one element.
 */
/** Seconds. */
export const duration = { micro: 0.15, interactive: 0.2, transition: 0.3, reveal: 0.5, cinematic: 1.2 } as const;
/** out: default (entrances, hovers, reveals). exit: leaving elements. (CSS also has --ease-in-out / --ease-draw / --ease-cinematic.) */
export const ease = {
  out: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
} as const;
/** Springs: soft = settling panels, snappy = small UI, indicator = pills, flow = list items re-sorting, magnet = pointer-attracted elements. */
export const spring = {
  soft: { type: "spring", stiffness: 260, damping: 28 },
  snappy: { type: "spring", stiffness: 500, damping: 32 },
  indicator: { type: "spring", stiffness: 380, damping: 34 },
  flow: { type: "spring", stiffness: 340, damping: 34, mass: 0.9 },
  magnet: { type: "spring", stiffness: 220, damping: 18, mass: 0.4 },
} satisfies Record<string, Transition>;
