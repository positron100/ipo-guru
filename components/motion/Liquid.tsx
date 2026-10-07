"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { duration } from "@/components/motion/tokens";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";

/**
 * Springs adapt to how fast the target is changing, so the droplet feels right at every pace:
 *  - slow, deliberate hovers: soft springs, so it stretches and settles like a liquid;
 *  - quick sweeps: much stiffer springs and a tighter stretch limit, so it keeps up with the pointer instead of trailing it;
 *  - long jumps: stiffer again, so crossing the whole list takes about as long as crossing one option.
 * Damping is always (almost) critical, so speed never adds bounce. The leading edge is the stiff one; the trailing edge
 * is looser, which is what makes the droplet stretch.
 */
const spring = (stiffness: number, mass: number, zeta: number) =>
  ({ type: "spring", stiffness, mass, damping: zeta * 2 * Math.sqrt(stiffness * mass) }) as const;
/** The droplet keeps its shape: its length stays within this range of the slot length however the edges are being thrown about. */
const MIN_LEN = 0.88, MAX_LEN = 1.7;
/** Retarget interval (ms) -> speed factor, and the stretch limit that goes with it (faster pointer, tighter droplet). */
function pace(dt: number): { rate: number; maxLen: number } {
  if (dt < 45) return { rate: 3.4, maxLen: 1.15 };
  if (dt < 90) return { rate: 2.5, maxLen: 1.3 };
  if (dt < 170) return { rate: 1.7, maxLen: 1.45 };
  if (dt < 320) return { rate: 1.2, maxLen: 1.6 };
  return { rate: 1, maxLen: MAX_LEN };
}

/**
 * Liquid selection / hover indicator: ONE element that follows whichever item is active, never a new highlight per item.
 * Its two edges are separate springs: when the target moves forward, the leading edge leaps ahead and the trailing edge lags
 * (and vice versa), so the droplet stretches across the gap and contracts into its new slot, squashing very slightly as it
 * lengthens. `axis="x"` slides along a row (pills, navbar); `axis="y"` slides down a list (dropdown menus).
 * Position/size come from `selector` matching the active element inside `containerRef` (which must be `position: relative`
 * and be the active element's offset parent); the element is read from the DOM, so no React state.
 * Resizes snap without animating. Reduced motion jumps straight to the new slot.
 */
export function LiquidIndicator({ containerRef, selector, watch, inset = 0, className = "", visible = true, lift = false, axis = "x" }: {
  containerRef: RefObject<HTMLElement | null>; selector: string; watch: unknown; inset?: number; className?: string;
  /** Fade in/out (hover indicators). When it re-appears it jumps to its slot instead of sliding in from where it was last seen. */
  visible?: boolean;
  /** The pointer is over the thing this indicator already marks: swell a little, with a springy settle, so it still responds. */
  lift?: boolean;
  axis?: "x" | "y";
}) {
  const reduce = useReducedMotion();
  const lo = useMotionValue(0);                         // leading/trailing edges along the axis
  const hi = useMotionValue(0);
  const base = useMotionValue(1);                       // length of the slot we are heading to
  // Length and squash are plain values kept in step with the two edges by `sync` below. (Derived values missed the first
  // placement when React StrictMode ran the effect twice in development, leaving the pill zero-sized until the next move.)
  const size = useMotionValue(0);
  const start = useMotionValue(0);
  const squash = useMotionValue(1);
  // Wrapped rows (axis x): the options sit on several lines, so the droplet must be one option tall, not the whole box tall.
  const [rowMode, setRowMode] = useState(false);
  const rowTop = useMotionValue(0);
  const rowH = useMotionValue(0);
  const maxLen = useRef(MAX_LEN);                      // current stretch limit (tightens as the pointer speeds up)
  const lastRetarget = useRef(0);
  const leadingHi = useRef(true);                      // moving toward larger offsets: the `hi` edge leads
  const placed = useRef(false);
  const wasShown = useRef(false);

  useEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    if (!visible) { wasShown.current = false; return; }
    const slot = () => {
      const el = box.querySelector<HTMLElement>(selector);
      if (!el) return null;
      // Position of the target inside `box`, summed up the offset-parent chain. A target's own offsetLeft/offsetTop is only relative
      // to its nearest positioned/transformed ancestor, which is a wrapper (e.g. a magnetic-hover wrapper) rather than `box` when the
      // target is wrapped; reading it directly gives 0 and the indicator never travels.
      const prop = axis === "x" ? "offsetLeft" : "offsetTop";
      let at = 0;
      let cur: HTMLElement | null = el;
      while (cur && cur !== box) { at += cur[prop]; cur = cur.offsetParent as HTMLElement | null; }
      if (cur !== box) { // chain never reached the box: fall back to measured rects
        const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
        at = axis === "x" ? r.left - b.left : r.top - b.top;
      }
      const len = axis === "x" ? el.offsetWidth : el.offsetHeight;
      let top = 0;
      if (axis === "x") { cur = el; while (cur && cur !== box) { top += cur.offsetTop; cur = cur.offsetParent as HTMLElement | null; } }
      const wrapped = axis === "x" && box.offsetHeight > el.offsetHeight + inset * 2 + 6;
      return { l: at, r: at + len, top, h: el.offsetHeight, wrapped };
    };
    const place = (n: NonNullable<ReturnType<typeof slot>>) => { rowTop.set(n.top); rowH.set(n.h); setRowMode(n.wrapped); };
    const sync = () => {
      // Rendered shape = a droplet of clamped length, anchored on the LEADING edge. Fast, repeated retargeting can throw the
      // edges far apart or across each other; clamping keeps it a pill, and anchoring keeps the front of it on the spring's path.
      const b = Math.max(base.get(), 1);
      const raw = hi.get() - lo.get();
      const len = Math.min(Math.max(raw, b * MIN_LEN), b * maxLen.current);
      size.set(len);
      // A direction reversal mid-flight carries spring velocity past the ends; the droplet never leaves its container.
      const room = Math.max(0, (axis === "x" ? box.offsetWidth : box.offsetHeight) - len);
      const st = leadingHi.current ? hi.get() - len : lo.get();
      start.set(Math.min(Math.max(st, 0), room));
      squash.set(1 - Math.min(0.1, Math.max(0, (len - b) / b) * 0.22));
    };
    const offLo = lo.on("change", sync);
    const offHi = hi.on("change", sync);
    const s = slot();
    if (!s) return () => { offLo(); offHi(); };
    base.set(s.r - s.l);
    place(s);
    if (!placed.current || reduce || !wasShown.current) {
      lo.set(s.l); hi.set(s.r); placed.current = true;
    } else {
      // Direction comes from where the droplet is NOW (its centre), not from one edge, so mid-flight retargets stay consistent.
      const centreNow = (lo.get() + hi.get()) / 2, centreTo = (s.l + s.r) / 2;
      const forward = centreTo > centreNow;
      leadingHi.current = forward;
      const now = performance.now();
      const { rate, maxLen: cap } = pace(now - lastRetarget.current);
      lastRetarget.current = now;
      maxLen.current = cap;
      const reach = Math.min(3, 1 + Math.abs(centreTo - centreNow) / ((s.r - s.l) * 2.5)); // long jumps get stiffer
      const k = rate * reach;
      const lead = spring(520 * k, 0.7, 1), trail = spring(150 * k, 1, 0.92);
      animate(lo, s.l, forward ? trail : lead);
      animate(hi, s.r, forward ? lead : trail);
    }
    wasShown.current = true;
    sync();
    const ro = new ResizeObserver(() => {
      const n = slot();
      if (n) { lo.set(n.l); hi.set(n.r); base.set(n.r - n.l); place(n); sync(); }
    });
    ro.observe(box);
    return () => { offLo(); offHi(); ro.disconnect(); };
  }, [containerRef, selector, watch, axis, reduce, visible, inset, lo, hi, base, size, start, squash, rowTop, rowH]);

  return (
    <motion.span
      aria-hidden
      className={className}
      initial={false}
      animate={{ opacity: visible ? 1 : 0, scale: lift ? 1.08 : 1 }}
      transition={{ opacity: { duration: duration.interactive }, scale: { type: "spring", stiffness: 420, damping: 14, mass: 0.7 } }}
      data-lift={lift ? "" : undefined}
      style={axis === "x" ? (rowMode ? { left: start, width: size, scaleY: squash, top: rowTop, height: rowH } : { left: start, width: size, scaleY: squash, top: inset, bottom: inset }) : { top: start, height: size, scaleX: squash, left: inset, right: inset }}
    />
  );
}
