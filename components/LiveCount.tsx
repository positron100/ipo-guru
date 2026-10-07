"use client";
import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { duration, ease } from "@/components/motion/tokens";

/**
 * Integer that tweens only when `value` really changes (a filter result), never on mount. The visible text is aria-hidden and
 * tabular so the count does not jitter; assistive tech reads a static span that only ever holds the final number.
 */
export function LiveCount({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || shown.current === value) return;
    const from = shown.current;
    shown.current = value;
    if (reduce) { el.textContent = String(value); return; }
    const c = animate(from, value, {
      duration: duration.transition, ease: ease.out,
      onUpdate: (v) => { el.textContent = String(Math.round(v)); },
      onComplete: () => { el.textContent = String(value); },
    });
    return () => { c.stop(); el.textContent = String(value); };
  }, [value, reduce]);

  return (
    <>
      <span ref={ref} className={`num inline-block tabular-nums ${className ?? ""}`} aria-hidden>{value}</span>
      <span className="sr-only">{value}</span>
    </>
  );
}
