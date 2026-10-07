import type { Kpi } from "@/lib/subscription";
import { fmtX } from "@/lib/subscription";
import { GlowCard } from "@/components/glass/Glass";
import { Icon } from "@/components/Icon";
import { CountUp } from "@/components/CountUp";
import { BreathingArrow } from "@/components/Breathing";

const css = (o: Record<string, string | number>) => o as React.CSSProperties;

/**
 * Headline cards: latest multiple dominates; change since the previous reported day and a plain support label are secondary.
 * The first card (Total, when reported) is the primary one.
 * Phones: ONE joined module (shared outer border, hairline dividers, one radius). Total spans the row, the categories pair up in
 * near-square cells, and an odd last category spans the row on purpose (2+1) instead of being left over. At 640px and up
 * these are the same separate cards as before.
 */
export function SubscriptionKpis({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 max-sm:gap-px max-sm:overflow-hidden max-sm:rounded-[var(--radius-panel)] max-sm:border max-sm:border-line max-sm:bg-[var(--border)] max-sm:shadow-[var(--shadow-sm)] sm:gap-4 lg:grid-cols-4 lg:gap-6">
      {kpis.map((k, i) => {
        const primary = i === 0;
        const lone = !primary && i === kpis.length - 1 && i % 2 === 1;
        const wide = primary || lone;
        const up = k.delta !== null && k.delta > 0.0049, down = k.delta !== null && k.delta < -0.0049;
        return (
          <GlowCard
            key={k.key}
            className={[
              "enter group flex flex-col justify-between gap-3 p-4 sm:gap-6 sm:p-6 lg:p-7",
              "max-sm:rounded-none max-sm:border-0 max-sm:bg-[var(--surface-strong)] max-sm:shadow-none max-sm:active:!transform-none",
              wide ? "col-span-2 lg:col-span-1" : "max-sm:min-h-[10.5rem]",
              primary ? "bg-gradient-to-br from-accent/10 to-transparent" : "",
            ].join(" ")}
            style={css({ "--i": i })}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="t-caption">{k.label}</p>
              <Icon name={k.key === "total" ? "pie" : "trend"} size={16} className="ico-pop text-faint transition-colors duration-300 group-hover:text-accent" />
            </div>
            <div>
              <p className={`t-metric origin-left whitespace-nowrap transition-transform sm:whitespace-normal duration-300 group-hover:scale-[1.05] ${primary ? "text-4xl sm:text-6xl" : wide ? "text-4xl sm:text-5xl" : "text-[clamp(1.5rem,7.6vw,1.875rem)] sm:text-5xl"}`}><CountUp value={k.value} format="x" /></p>
              {/* phone: comparison, then the descriptor on its own line. Narrow cells stack "vs Day N" directly under the value (still one unit); desktop keeps the inline wrap */}
              <div className={`mt-2 flex flex-col items-start sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1 ${wide ? "gap-1" : "gap-1.5"}`}>
                {k.delta !== null && (
                  <span className={`${up ? "trend-up text-gain" : down ? "trend-down text-loss" : "text-muted"} t-small inline-flex items-center gap-1 whitespace-nowrap font-medium ${wide ? "" : "max-sm:grid max-sm:grid-cols-[auto_auto] max-sm:justify-start max-sm:gap-y-0.5"}`}>
                    <BreathingArrow dir={up ? "up" : down ? "down" : "flat"} />
                    <span>{up || down ? fmtX(Math.abs(k.delta)) : "Unchanged"}</span>
                    {k.prevDay && <span className={`font-normal text-faint ${wide ? "" : "max-sm:col-start-2"}`}>vs {k.prevDay}</span>}
                  </span>
                )}
                <span className="t-small text-faint">{k.support}</span>
              </div>
            </div>
          </GlowCard>
        );
      })}
    </div>
  );
}
