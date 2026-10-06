"use client";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { duration, ease } from "@/components/motion/tokens";
import { pct, rupee, signedRupee } from "@/lib/format";

/** Same strings the static UI prints, so the final frame is exactly the server-rendered text. */
const FORMATS = {
  gmp: (v: number) => (v === 0 ? "₹0" : signedRupee(v)!),
  pct: (v: number) => pct(v)!,
  rupee: (v: number) => rupee(v)!,
  x: (v: number) => `${v.toFixed(2)}x`,
} as const;
export type CountFormat = keyof typeof FORMATS;

/**
 * Headline-metric count-up: once, the first time the number is on screen (and again only if `value` itself changes), ~0.5 s.
 * Not for table cells. The server renders the exact final text, so it is correct without JS, for reduced motion and in print;
 * the span keeps its final width while counting so nothing around it shifts.
 */
export function CountUp({ value, format }: { value: number; format: CountFormat }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef<number | null>(null); // what the DOM currently shows (null = not animated yet)
  const reduce = useReducedMotion();
  const seen = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const fmt = FORMATS[format];

  useEffect(() => {
    const el = ref.current;
    if (!el || !seen) return;
    if (reduce || shown.current === value) { shown.current = value; return; }
    const from = shown.current ?? 0;
    const dp = Math.min(2, (String(value).split(".")[1] ?? "").length);
    const k = 10 ** dp;
    el.style.minWidth = `${el.offsetWidth}px`;
    const c = animate(from, value, {
      duration: duration.reveal, ease: ease.out,
      onUpdate: (v) => { el.textContent = fmt(Math.round(v * k) / k); },
      onComplete: () => { el.textContent = fmt(value); el.style.minWidth = ""; },
    });
    shown.current = value;
    return () => { c.stop(); el.textContent = fmt(value); el.style.minWidth = ""; };
  }, [seen, value, reduce, fmt]);

  return <span ref={ref} className="inline-block">{fmt(value)}</span>;
}
