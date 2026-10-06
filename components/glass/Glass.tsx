"use client";
import { useRef, type ElementType, type ReactNode } from "react";

type Props = { children?: ReactNode; className?: string; as?: ElementType } & Record<string, unknown>;

/**
 * GlassCard with hover lift, border light and a radial highlight that follows the cursor.
 * Pointer position goes to CSS variables on the element: no React state, no re-render.
 */
export function GlowCard({ children, className = "", as: Tag = "div", tilt = true, ...rest }: Props & { tilt?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    if (!tilt) return; // large cards stay flat: lift + glow only
    // HoverTilt: a degree or two toward the pointer, only on cards small enough for it to read as tactile.
    const t = Math.min(1, 520 / r.width) * 2;
    el.style.setProperty("--ry", `${((x / r.width) - 0.5) * 2 * t}deg`);
    el.style.setProperty("--rx", `${-((y / r.height) - 0.5) * 2 * t}deg`);
  };
  const reset = () => { ref.current?.style.removeProperty("--rx"); ref.current?.style.removeProperty("--ry"); };
  return (
    <Tag ref={ref} onPointerMove={move} onPointerLeave={reset} className={`glass glass-card interactive overflow-hidden ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
