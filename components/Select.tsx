"use client";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { duration, ease, spring } from "@/components/motion/tokens";
import { ScrollArea } from "@/components/ScrollHints";
import { LiquidIndicator } from "@/components/motion/Liquid";

export interface Option { value: string; label: string }

/**
 * Glass dropdown replacing the native <select> (whose popup cannot be styled).
 * Pattern: button + listbox with aria-activedescendant. Keys: ↑ ↓ Home End Enter Space Esc Tab, plus type-ahead.
 */
export function Select({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (v: string) => void }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const track = useRef<HTMLDivElement>(null); // positioned parent the single liquid highlight lives in
  const typed = useRef({ s: "", t: 0 });
  const [open, setOpen] = useState(false);
  const selected = Math.max(0, options.findIndex((o) => o.value === value));
  const [active, setActive] = useState(selected);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

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
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        aria-label={`${label}: ${options[selected].label}`}
        onClick={() => (open ? setOpen(false) : show())}
        className={`group btn btn-ghost !gap-2 !py-2.5 !pl-4 !pr-3.5 !text-sm ${open ? "!border-accent !shadow-[0_0_0_3px_var(--accent-soft)]" : ""}`}
      >
        <span className="t-caption !tracking-wider">{label}</span>
        <span className="font-semibold">{options[selected].label}</span>
        <svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`text-faint transition-transform duration-300 ${open ? "rotate-180" : "group-hover:translate-y-0.5"}`}>
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: spring.snappy }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: duration.micro, ease: ease.exit } }}
            style={{ transformOrigin: "top left" }}
            className="glass glass-card absolute left-0 top-[calc(100%+0.5rem)] z-40 min-w-full bg-bg shadow-[var(--shadow-lg)]"
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
                  {o.label}
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={on ? "opacity-100" : "opacity-0"}>
                    <path d="m5 12 5 5 9-9" />
                  </svg>
                </li>
              );
            })}
          </ul>
          </div>
          </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
