"use client";
import { useRef, useState } from "react";
import { LiquidIndicator } from "@/components/motion/Liquid";

export interface PillOption<T extends string> { value: T; label: string; count?: number; /** CSS colour for a small leading dot. */ dot?: string }

/**
 * Segmented control: a matte translucent pill that stretches to the selected option, plus a faint hover pill that follows
 * the pointer (see LiquidIndicator). Used by the market board filters and the subscription chart's category filter.
 */
export function Pills<T extends string>({ label, value, onChange, onHover, options, fit = false }: {
  label: string; value: T; onChange: (v: T) => void; onHover?: (v: T | null) => void; options: PillOption<T>[];
  /** On phones keep every option on ONE line: smaller text and padding, and a sideways swipe only if they still do not fit. */
  fit?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHoverState] = useState<T | null>(null);
  const setHover = (v: T | null) => { setHoverState(v); onHover?.(v); };
  return (
    <div ref={box} role="radiogroup" aria-label={label} onPointerLeave={() => setHover(null)} className={`glass relative inline-flex max-w-full gap-1 p-1 ${fit ? "w-full flex-nowrap overflow-x-auto rounded-full sm:w-auto sm:flex-wrap sm:overflow-visible" : "flex-wrap rounded-3xl sm:rounded-full"}`}>
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
            className={`relative z-10 rounded-full ${fit ? "shrink-0 grow whitespace-nowrap px-2 py-2 text-xs sm:grow-0 sm:px-4 sm:text-sm" : "px-4 py-2 text-sm"} font-medium transition-colors duration-200 active:scale-[0.97] ${on ? "text-fg" : "text-muted hover:text-fg"}`}
          >
            <span className={`inline-flex items-center ${fit ? "gap-1 sm:gap-2" : "gap-2"}`}>
              {o.dot && <span className="size-2 rounded-full" style={{ background: o.dot }} aria-hidden />}
              {o.label}
              {o.count !== undefined && <span className="num text-[0.6875rem] text-faint sm:text-xs">{o.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
