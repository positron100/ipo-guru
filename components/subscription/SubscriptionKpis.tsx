import type { Kpi } from "@/lib/subscription";
import { fmtX } from "@/lib/subscription";
import { GlowCard } from "@/components/glass/Glass";
import { Icon } from "@/components/Icon";
import { CountUp } from "@/components/CountUp";

const css = (o: Record<string, string | number>) => o as React.CSSProperties;

/**
 * Headline cards: latest multiple dominates; change since the previous reported day and a plain support label are secondary.
 * The first card (Total, when reported) is the primary one. On phones it spans the full row, the rest pair up.
 */
export function SubscriptionKpis({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
      {kpis.map((k, i) => {
        const primary = i === 0;
        const up = k.delta !== null && k.delta > 0.0049, down = k.delta !== null && k.delta < -0.0049;
        return (
          <GlowCard
            key={k.key}
            className={`enter group flex flex-col justify-between gap-6 p-5 sm:p-6 lg:p-7 ${primary ? "col-span-2 bg-gradient-to-br from-accent/10 to-transparent lg:col-span-1" : ""}`}
            style={css({ "--i": i })}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="t-caption">{k.label}</p>
              <Icon name={k.key === "total" ? "pie" : "trend"} size={16} className="ico-pop text-faint transition-colors duration-300 group-hover:text-accent" />
            </div>
            <div>
              <p className={`t-metric origin-left transition-transform duration-300 group-hover:scale-[1.05] ${primary ? "text-5xl sm:text-6xl" : "text-[clamp(1.625rem,8vw,2.25rem)] sm:text-5xl"}`}><CountUp value={k.value} format="x" /></p>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
                {k.delta !== null && (
                  <span className={`${up ? "trend-up text-gain" : down ? "trend-down text-loss" : "text-muted"} t-small inline-flex items-center gap-1 whitespace-nowrap font-medium`}>
                    <Icon name={up ? "up" : down ? "down" : "flat"} size={14} />
                    {up || down ? fmtX(Math.abs(k.delta)) : "Unchanged"}
                    {k.prevDay && <span className="font-normal text-faint">vs {k.prevDay}</span>}
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
