import type { SubModel } from "@/lib/subscription";
import { fmtX } from "@/lib/subscription";
import { GlassPanel } from "@/components/glass/GlassStatic";
import { GlowCard } from "@/components/glass/Glass";
import { ScrollArea } from "@/components/ScrollHints";
import { Icon } from "@/components/Icon";

const css = (o: Record<string, string | number>) => o as React.CSSProperties;

/**
 * Exact numbers, one row per category and one column per reported day. A bar sits behind each value; its length is
 * sqrt(value / largest value shown) so one very large category (e.g. QIB at 150x) does not flatten the rest, and the exact
 * multiple is always printed. The latest day is emphasised because it is the current state.
 */
export function SubscriptionMatrix({ model }: { model: SubModel }) {
  const { dayLabels, categories } = model;
  const n = dayLabels.length;
  const shown = categories.flatMap((c) => c.values).filter((v): v is number => v !== null);
  const max = Math.max(1, ...shown);
  // sm+: category column + one column per day (needs ~150 + 112 per day px). Phones: each category is a block, its days laid out side by side under its name.
  const vars = css({ "--cols": `minmax(7rem,1.1fr) repeat(${n}, minmax(5.75rem,1fr))`, "--n": n, "--minw": `${150 + n * 112}px` });

  return (
    <GlassPanel className="overflow-hidden">
      <ScrollArea>
        <div role="table" aria-label="Subscription by category and day" className="p-3 sm:min-w-[var(--minw)] lg:p-4" style={vars}>
          <div role="row" className="hidden items-center gap-x-3 px-3 py-3 sm:grid sm:[grid-template-columns:var(--cols)] lg:px-4">
            <span role="columnheader" className="t-caption">Category</span>
            {dayLabels.map((d, i) => (
              <span key={d} role="columnheader" className={`t-caption text-right ${i === n - 1 ? "!text-accent" : ""}`}>
                {d}{i === n - 1 && n > 1 && <span className="sr-only"> (latest)</span>}
              </span>
            ))}
          </div>

          {categories.map((c, r) => (
            <div
              key={c.key}
              role="row"
              className="enter group grid grid-cols-[repeat(var(--n),minmax(0,1fr))] items-center gap-x-2 gap-y-2 rounded-xl px-2 py-3.5 transition-[background-color,translate] duration-200 hover:translate-x-0.5 hover:bg-line sm:gap-x-3 sm:[grid-template-columns:var(--cols)] sm:px-3 lg:px-4"
              style={css({ "--i": r })}
            >
              <span role="rowheader" className="col-span-full font-medium transition-transform duration-300 group-hover:translate-x-1 sm:col-auto">{c.label}</span>
              {c.values.map((v, i) => {
                const latest = i === n - 1;
                const w = v === null ? 0 : Math.sqrt(Math.min(v, max) / max) * 100;
                return (
                  <span key={i} role="cell" className="block">
                    <span aria-hidden className="t-caption mb-1 block text-right normal-case tracking-normal sm:hidden">{dayLabels[i]}</span>
                    <span className="relative block h-9 text-right">
                    {v !== null && (
                      <span
                        className={`bar-grow absolute inset-y-1 left-0 rounded-md transition-colors duration-300 ${latest ? "bg-accent/25 group-hover:bg-accent/35" : "bg-accent/[0.09] group-hover:bg-accent/20"}`}
                        style={css({ width: `${Math.max(w, 2)}%`, "--i": r, "--c": i })}
                        aria-hidden
                      />
                    )}
                    <span className={`num relative z-10 flex h-full items-center justify-end pr-2.5 ${v === null ? "text-faint" : latest ? "font-semibold" : "text-muted"}`}>
                      {v === null ? "—" : fmtX(v)}
                    </span>
                    </span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
      <p className="t-small border-t border-line px-6 py-4 text-faint lg:px-8">
        Bar length uses a square-root scale relative to the largest value shown; the exact multiple is always printed.
        {model.updatedAtLabel && <> Source last updated: {model.updatedAtLabel} IST.</>}
      </p>
    </GlassPanel>
  );
}

/** The conclusion of the section: total subscription per reported day, the latest one dominant. */
export function SubscriptionTotal({ model }: { model: SubModel }) {
  const t = model.total;
  if (!t) return null;
  const n = model.dayLabels.length;
  return (
    <GlowCard tilt={false} className="enter group p-7 shadow-[0_24px_60px_-34px_color-mix(in_oklab,var(--accent)_70%,transparent)] lg:p-10" style={css({ "--i": 2, borderColor: "color-mix(in oklab, var(--accent) 28%, var(--border))" })}>
      <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-16">
        <div>
          <p className="t-caption flex items-center gap-2"><Icon name="pie" size={14} className="ico-pop" />Total</p>
          <p className="t-body mt-3 max-w-[16rem]">Overall subscription across every category.</p>
        </div>
        <dl className="flex flex-wrap items-end justify-start gap-x-10 gap-y-6 lg:justify-end lg:gap-x-14">
          {model.dayLabels.map((d, i) => {
            const v = t.values[i];
            const latest = i === n - 1;
            return (
              <div key={d} className="min-w-[4.5rem]">
                <dt className="t-caption">{d}</dt>
                <dd className={`t-metric mt-2 origin-left transition-transform duration-300 ${latest ? "text-5xl text-accent group-hover:scale-[1.06] lg:text-7xl" : "text-3xl text-muted"}`}>
                  {v === null ? <span className="text-xl font-normal text-faint">—</span> : fmtX(v)}
                </dd>
                {latest && n > 1 && (
                  <p className="trend-up t-small mt-2 inline-flex items-center gap-1.5 font-medium text-accent"><Icon name="up" size={14} />latest subscription</p>
                )}
              </div>
            );
          })}
        </dl>
      </div>
    </GlowCard>
  );
}
