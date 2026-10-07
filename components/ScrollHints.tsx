"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Distance (px) from an edge inside which "there is more beyond" stops being true. */
const SLACK = 12;

type Dir = "down" | "right";
const ARROW: Record<Dir, string> = { down: "M12 5v14M6 13l6 6 6-6", right: "M5 12h14M13 6l6 6-6 6" };

/** Round arrow button wearing the orbiting accent arc + trailing glow (`.attn` in globals.css). Hidden when `show` is false. */
function Chip({ dir, show, onClick, className }: { dir: Dir; show: boolean; onClick: () => void; className: string }) {
  return (
    <button
      type="button"
      aria-label={dir === "down" ? "Scroll down" : "Scroll right"}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      onClick={onClick}
      className={`attn z-20 grid size-9 place-items-center rounded-full border bg-[var(--surface-strong)] text-fg backdrop-blur-[3px] transition-opacity duration-500 ${show ? "opacity-100" : "pointer-events-none opacity-0"} ${className}`}
    >
      <svg className={dir === "down" ? "nudge-down" : "nudge-right"} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={ARROW[dir]} />
      </svg>
    </button>
  );
}

const smooth = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

/**
 * Page scrollbar replacement: a fixed down arrow shown only while more page is below the fold.
 * Native scrolling is untouched (the bar itself is hidden in CSS).
 */
export function ScrollDownHint() {
  const [more, setMore] = useState(false);
  useEffect(() => {
    const check = () => {
      const el = document.documentElement;
      const next = el.scrollHeight - el.clientHeight > 2 && scrollY + innerHeight < el.scrollHeight - 40;
      setMore((p) => (p === next ? p : next));
    };
    check();
    addEventListener("scroll", check, { passive: true });
    addEventListener("resize", check);
    const ro = new ResizeObserver(check); // content height changes without any scroll event
    ro.observe(document.body);
    return () => { removeEventListener("scroll", check); removeEventListener("resize", check); ro.disconnect(); };
  }, []);
  return <Chip dir="down" show={more} onClick={() => scrollBy({ top: innerHeight * 0.85, behavior: smooth() })} className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-5 sm:bottom-6 sm:right-8 lg:right-12 [@media(hover:none)]:hidden" />;
}

/**
 * Scroll container with no native scrollbar. Shows a down arrow while there is more below and a right arrow
 * while there is more to the right; clicking pages the content. Sticky headers/columns inside keep working.
 */
export function ScrollArea({ children, className = "", scrollClassName = "" }: { children: ReactNode; className?: string; scrollClassName?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ down: false, right: false });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const check = () => {
      const down = el.scrollHeight - el.clientHeight > 2 && el.scrollTop + el.clientHeight < el.scrollHeight - SLACK;
      const right = el.scrollWidth - el.clientWidth > 2 && el.scrollLeft + el.clientWidth < el.scrollWidth - SLACK;
      setMore((p) => (p.down === down && p.right === right ? p : { down, right }));
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, []);
  const page = (o: ScrollToOptions) => box.current?.scrollBy({ ...o, behavior: smooth() });
  return (
    <div className={`relative ${className}`}>
      <div ref={box} className={`overflow-auto ${scrollClassName}`}>{children}</div>
      <Chip dir="down" show={more.down} onClick={() => page({ top: (box.current?.clientHeight ?? 0) * 0.8 })} className="absolute bottom-3 left-1/2 -translate-x-1/2" />
      <Chip dir="right" show={more.right} onClick={() => page({ left: (box.current?.clientWidth ?? 0) * 0.8 })} className="absolute right-3 top-1/2 -translate-y-1/2" />
    </div>
  );
}
