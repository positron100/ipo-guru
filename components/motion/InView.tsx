"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Starts chart / bar animations when the block is actually seen.
 *
 * The animations themselves are plain CSS (`.bar-grow`, `.draw-line`, `.chart-area`, `.chart-dot` in globals.css) so they
 * run immediately without JS. If this block is below the fold when it mounts, we hold them (`.view-anim`, which also restarts
 * them from their first frame) and release them (`data-in`) the first time it scrolls into view. Blocks already on screen
 * are left alone, so above-the-fold charts do not restart. Reduced motion never holds anything.
 */
export function InView({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.85 && r.bottom > 0) return;
    el.classList.add("view-anim");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) { el.setAttribute("data-in", ""); io.disconnect(); }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}
