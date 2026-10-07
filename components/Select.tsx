"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { duration, ease, spring } from "@/components/motion/tokens";
import { ScrollArea } from "@/components/ScrollHints";
import { LiquidIndicator } from "@/components/motion/Liquid";

export interface Option { value: string; label: string; /** Shorter text for the closed button. */ short?: string; count?: number; /** Tailwind background class for a small leading dot. */ dot?: string }

/**
 * Glass dropdown replacing the native <select> (whose popup cannot be styled).
 * Pattern: button + listbox with aria-activedescendant. Keys: ↑ ↓ Home End Enter Space Esc Tab, plus type-ahead.
 */
export function Select({ label, value, options, onChange, align = "left", compact = false }: { label: string; value: string; options: Option[]; onChange: (v: string) => void; /** Which edge of the button the menu lines up with (use "right" for a control at the right edge of a narrow screen). */ align?: "left" | "right"; /** Hide the visible label (the aria-label stays) to save width on a phone. */ compact?: boolean }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  // The menu is portalled to <body> and fixed under the button: inside the page, an ancestor with an animated opacity is a "backdrop root"
  // and would stop the menu blurring the content it covers.
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number; minWidth: number } | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const track = useRef<HTMLDivElement>(null); // positioned parent the single liquid highlight lives in
  const typed = useRef({ s: "", t: 0 });
  const [open, setOpen] = useState(false);
  const selected = Math.max(0, options.findIndex((o) => o.value === value));
  const [active, setActive] = useState(selected);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && !menu.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btn.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 8, ...(align === "right" ? { right: innerWidth - r.right } : { left: r.left }), minWidth: r.width });
    };
    place();
    addEventListener("scroll", place, { passive: true, capture: true });
    addEventListener("resize", place);
    return () => { removeEventListener("scroll", place, true); removeEventListener("resize", place); };
  }, [open, align]);

  const show = () => { setActive(selected); setOpen(true); };
  const pick = (i: number) => { onChange(options[i].value); setOpen(false); };
  const move = (i: number) => setActive(Math.min(options.length - 1, Math.max(0, i)));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") return setOpen(false);
    if (e.key === "Escape") { if (open) { e.preventDefault(); setOpen(false); } return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return show();
      return move(active + (e.key === "ArrowDown" ? 1 : -1));
    }
    if (e.key === "Home" || e.key === "End") { if (open) { e.preventDefault(); move(e.key === "Home" ? 0 : options.length - 1); } return; }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      return open ? pick(active) : show();
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { // type-ahead
      const t = typed.current, now = Date.now();
      t.s = now - t.t > 600 ? e.key.toLowerCase() : t.s + e.key.toLowerCase();
      t.t = now;
      const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(t.s));
      if (hit >= 0) { if (!open) show(); setActive(hit); }
    }
  };

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={btn}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        aria-label={`${label}: ${options[selected].label}${options[selected].count !== undefined ? `, ${options[selected].count}` : ""}`}
        onClick={() => (open ? setOpen(false) : show())}
        className={`group btn btn-ghost !gap-2 !py-2.5 !pl-4 !pr-3.5 !text-sm ${open ? "!border-accent !shadow-[0_0_0_3px_var(--accent-soft)]" : ""}`}
      >
        <span className={`t-caption !tracking-wider ${compact ? "hidden" : ""}`}>{label}</span>
        <span className="flex items-center gap-1.5 font-semibold">{options[selected].dot && <span className={`size-2 rounded-full ${options[selected].dot}`} aria-hidden />}{options[selected].short ?? options[selected].label}{options[selected].count !== undefined && <span className="num font-normal text-muted">{options[selected].count}</span>}</span>
        <svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`text-faint transition-transform duration-300 ${open ? "rotate-180" : "group-hover:translate-y-0.5"}`}>
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>

      {typeof document !== "undefined" && createPortal(
      <AnimatePresence>
        {open && pos && (
          <motion.div
            ref={menu}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: spring.snappy }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: duration.micro, ease: ease.exit } }}
            style={{ transformOrigin: align === "right" ? "top right" : "top left", top: pos.top, left: pos.left, right: pos.right, minWidth: pos.minWidth }}
            className={`glass glass-float glass-card fixed z-[90] bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] shadow-[var(--shadow-lg)]`}
          >
          <ScrollArea scrollClassName="max-h-64 p-1.5">
          <div ref={track} className="relative">
          {/* One highlight for the whole menu: it glides to whichever option the pointer or keyboard is on. */}
          <LiquidIndicator containerRef={track} selector="[data-active]" watch={active} axis="y" className="liquid-hover rounded-full" />
          <ul ref={list} id={`${id}-list`} role="listbox" aria-label={label}>
            {options.map((o, i) => {
              const on = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={on}
                  data-active={active === i ? "" : undefined}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => pick(i)}
                  className={`relative z-10 flex cursor-pointer items-center justify-between gap-6 whitespace-nowrap rounded-full px-4 py-2.5 text-sm transition-colors duration-150 ${on ? "font-semibold text-accent" : "text-fg"}`}
                >
                  <span className="flex items-center gap-2.5">
                    {o.dot && <span className={`size-2 rounded-full ${o.dot}`} aria-hidden />}
                    {o.label}
                  </span>
                  <span className="flex items-center gap-3">
                    {o.count !== undefined && <span className="num text-xs text-faint">{o.count}</span>}
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={on ? "opacity-100" : "opacity-0"}>
                    <path d="m5 12 5 5 9-9" />
                  </svg>
                  </span>
                </li>
              );
            })}
          </ul>
          </div>
          </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}
    </div>
  );
}
