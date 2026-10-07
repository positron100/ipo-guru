"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LiquidIndicator } from "@/components/motion/Liquid";
import { ease } from "@/components/motion/tokens";
import type { PillOption } from "@/components/Pills";

const H = 42;     // same height as the Select buttons beside it
const GAP = 4;    // between the pill and its detached close button

/**
 * One pill, two states. Collapsed it shows the current choice; expanded the SAME pill has widened into the full set of options
 * with a detached × beside it that folds it back (the "View Project" control on the portfolio site works this way). Only the width
 * moves, between two measured natural widths, while the label hands over to the options. Phone-only: from sm: up the normal Pills show.
 */
export function ExpandPill<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: PillOption<T>[];
}) {
  const [open, setOpen] = useState(false);
  const [dims, setDims] = useState<{ c: number; e: number } | null>(null);
  const group = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const openBtn = useRef<HTMLButtonElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  // Widths of both states: collapsed hugs the chosen label; expanded fills the row, leaving room for the x so it lines up with the controls above.
  useLayoutEffect(() => {
    const measure = () => {
      const c = openBtn.current?.offsetWidth, g = group.current?.offsetWidth, e = g ? g - H - GAP : 0;
      if (c && e) setDims((d) => (d && d.c === c && d.e === e ? d : { c, e }));
    };
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    if (group.current) ro.observe(group.current);
    return () => ro.disconnect();
  }, [current.label]);

  useEffect(() => {
    if (open) row.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
    else if (wasOpen.current) openBtn.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open]);

  // Width: symmetric ease, a touch slower on the way back. The label hands over by cross-fading while the width is still moving
  // (the options fade out slowly as the pill narrows; the label fades in before it has finished), so text never blinks out.
  const t = reduce ? { duration: 0 } : { duration: open ? 0.5 : 0.75, ease: [0.65, 0, 0.35, 1] as const };
  const fade = (inDelay: number, outDelay = 0) => (reduce ? { duration: 0 } : { duration: open ? 0.3 : 0.4, ease: ease.out, delay: open ? inDelay : outDelay });

  return (
    <div ref={group} role="group" aria-label={label} className="flex w-full items-center py-1" onKeyDown={open ? (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } } : undefined}>
      <motion.div
        initial={false}
        animate={dims ? { width: open ? dims.e : dims.c } : undefined}
        transition={t}
        style={{ height: H }}
        className="glass relative overflow-hidden rounded-full"
      >
        <motion.button
          ref={openBtn}
          type="button"
          inert={open}
          aria-expanded={open}
          aria-label={`${label}: ${current.label}. Change`}
          onClick={() => setOpen(true)}
          animate={{ opacity: open ? 0 : 1, x: open ? -10 : 0, filter: open ? "blur(4px)" : "blur(0px)" }}
          transition={fade(0, 0.12)}
          style={dims ? { width: dims.c, height: H } : { height: H }}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold active:scale-[0.97]"
        >
          {current.label}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-faint"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </motion.button>

        <motion.div
          ref={row}
          role="radiogroup"
          aria-label={label}
          inert={!open}
          animate={{ opacity: open ? 1 : 0 }}
          transition={fade(0.15, 0)}
          style={dims ? { width: dims.e } : undefined}
          className="absolute inset-y-0 left-0 flex items-center justify-between gap-1 p-1"
        >
          <LiquidIndicator containerRef={row} selector="[data-liquid-on]" watch={value} inset={4} className="liquid liquid-lav rounded-full" />
          {options.map((o, i) => {
            const on = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                data-liquid-on={on ? "" : undefined}
                onClick={() => onChange(o.value)}
                className={`relative z-10 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 active:scale-[0.97] ${on ? "text-fg" : "text-muted"}`}
              >
                {/* Each option's text slides and de-blurs in one after another (and back out toward the label), so the options read as unfolding from the collapsed label. */}
                <motion.span
                  initial={false}
                  animate={open ? { opacity: 1, x: 0, filter: "blur(0px)" } : { opacity: 0, x: -12, filter: "blur(3px)" }}
                  transition={reduce ? { duration: 0 } : open ? { duration: 0.4, ease: ease.out, delay: 0.1 + i * 0.06 } : { duration: 0.3, ease: ease.out, delay: (options.length - 1 - i) * 0.03 }}
                  className="block"
                >
                  {o.label}
                </motion.span>
              </button>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Detached ×: its own small pill; its slot grows from 0 with the pill so nothing in the row is pushed. */}
      <motion.div initial={false} animate={{ width: open ? H + GAP : 0 }} transition={t} className="relative flex-none" style={{ height: H }}>
        <motion.button
          type="button"
          inert={!open}
          aria-label={`Close ${label.toLowerCase()} options`}
          onClick={() => setOpen(false)}
          initial={false}
          animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.6 }}
          transition={fade(0.15, 0)}
          style={{ width: H, height: H }}
          className={`glass absolute right-0 top-0 grid place-items-center rounded-full text-muted ${open ? "attn attn--red" : ""}`}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </motion.button>
      </motion.div>
    </div>
  );
}
