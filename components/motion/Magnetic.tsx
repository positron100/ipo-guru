"use client";
import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { spring } from "./tokens";

/** Wrapper whose child drifts a few px toward the pointer. Fine pointers only; inert under reduced motion. */
export function Magnetic({ children, strength = 8, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), spring.magnet);
  const y = useSpring(useMotionValue(0), spring.magnet);

  const move = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set(((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * strength);
    y.set(((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * strength);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div ref={ref} style={{ x, y }} onPointerMove={move} onPointerLeave={reset} className={`inline-block ${className}`}>
      {children}
    </motion.div>
  );
}
