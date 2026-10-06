"use client";
import { useRef, useState } from "react";
import { LiquidIndicator } from "@/components/motion/Liquid";

export interface PillOption<T extends string> { value: T; label: string; count?: number; /** CSS colour for a small leading dot. */ dot?: string }

/**
 * Segmented control: a matte translucent pill that stretches to the selected option, plus a faint hover pill that follows
 * the pointer (see LiquidIndicator). Used by the market board filters and the subscription chart's category filter.
 */
export function Pills<T extends string>({ label, value, onChange, onHover, options }: {
  label: string; value: T; onChange: (v: T) => void; onHover?: (v: T | null) => void; options: PillOption<T>[];
}) {
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHoverState] = useState<T | null>(null);
  const setHover = (v: T | null) => { setHoverState(v); onHover?.(v); };
  return (
    <div ref={box} role="radiogroup" aria-label={label} onPointerLeave={() => setHover(null)} className="glass relative inline-flex max-w-full flex-wrap gap-1 rounded-3xl p-1 sm:rounded-full">
      <LiquidIndicator containerRef={box} selector="[data-liquid-hover]" watch={hover} visible={hover !== null && hover !== value} inset={4} className="liquid-hover rounded-full" />
      <LiquidIndicator containerRef={box} selector="[data-liquid-on]" watch={value} lift={hover === value} inset={4} className="liquid liquid-lav rounded-full" />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            data-liquid-on={on ? "" : undefined}
            data-liquid-hover={hover === o.value ? "" : undefined}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") setHover(o.value); }}
            onFocus={() => setHover(o.value)}
            onBlur={() => setHover(null)}
            onClick={() => onChange(o.value)}
            className={`relative z-10 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 active:scale-[0.97] ${on ? "text-fg" : "text-muted hover:text-fg"}`}
          >
            <span className="inline-flex items-center gap-2">
              {o.dot && <span className="size-2 rounded-full" style={{ background: o.dot }} aria-hidden />}
              {o.label}
              {o.count !== undefined && <span className="num text-xs text-faint">{o.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
