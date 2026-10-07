import type { SubModel } from "@/lib/subscription";
import { fmtX } from "@/lib/subscription";
import { GlassCard, GlassPanel } from "@/components/glass/GlassStatic";
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
    <>
    <div className="hidden sm:block">
    <GlassPanel className="overflow-hidden">
      <ScrollArea>
        <div role="table" aria-label="Subscription by category and day" className="p-3 sm:min-w-[var(--minw)] lg:p-4" style={vars}>
          <div role="row" className="hidden items-center gap-x-3 px-3 py-3 sm:grid sm:[grid-template-columns:var(--cols)] lg:px-4">
            <span role="columnheader" className="t-caption">Category</span>
            {dayLabels.map((d, i) => (
              <span key={d} role="columnheader" className={`t-caption text-right ${i === n - 1 ? "!text-accent" : ""}`}>
                {i === n - 1 && n > 1 && <span aria-hidden className="dot-breathe relative mr-1.5 inline-block size-1.5 rounded-full bg-accent align-middle" />}{d}{i === n - 1 && n > 1 && <span className="sr-only"> (latest)</span>}
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
                    <span className={`num relative z-10 flex h-full items-center justify-end pr-2.5 text-sm sm:text-base ${v === null ? "text-faint" : latest ? "font-semibold" : "text-muted"}`}>
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
      <p className="t-small border-t border-line px-4 py-3 text-[0.75rem] text-faint sm:px-6 sm:py-4 sm:text-[0.875rem] lg:px-8">
        Bar length uses a square-root scale relative to the largest value shown; the exact multiple is always printed.
        {model.updatedAtLabel && <> Source last updated: {model.updatedAtLabel} IST.</>}
      </p>
    </GlassPanel>
    </div>
    <MobileCategories model={model} />
    </>
  );
}

/**
 * Phones: one card per category showing its progression day by day. The latest value is the headline (top right); below it a
 * vertical rail joins the days in order, each with a dot, its label and its multiple. The latest day is the filled accent dot
 * with a soft ring, a stronger figure and a small "Latest" tag; earlier days stay quiet. No bars: the chart above shows the trend,
 * this shows the exact figures. Desktop keeps the matrix above.
 */
function MobileCategories({ model }: { model: SubModel }) {
  const { dayLabels, categories } = model;
  const n = dayLabels.length;
  return (
    <div className="space-y-3 sm:hidden">
      {categories.map((c, r) => {
        const last = c.values[n - 1];
        return (
          <GlassCard key={c.key} as="section" aria-label={`${c.label} subscription by day`} className="enter p-4" style={css({ "--i": r })}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-base font-semibold">{c.label}</h4>
                <p className="t-caption mt-1">{n > 1 ? "Day by day" : "Latest"}</p>
              </div>
              <p className="t-metric num shrink-0 text-2xl text-accent">{last === null ? "—" : fmtX(last)}</p>
            </div>
            <ol className="mt-4">
              {c.values.map((v, i) => {
                const latest = i === n - 1;
                return (
                  <li key={dayLabels[i]} className="relative flex items-baseline justify-between gap-4 py-2 pl-6">
                    {i < n - 1 && (
                      <>
                        <span aria-hidden className="absolute left-[4.5px] top-1/2 h-full w-px bg-line-strong" />
                        <span aria-hidden className="rail-seg" style={css({ "--seg": i })} />
                      </>
                    )}
                    <span
                      aria-hidden
                      className={`absolute left-0 top-1/2 z-10 size-2.5 -translate-y-1/2 rounded-full ${latest ? "dot-breathe bg-accent ring-4 ring-[var(--accent-soft)]" : "border-2 border-line-strong bg-bg"}`}
                    />
                    <span className={`text-sm ${latest ? "font-semibold text-fg" : "text-faint"}`}>
                      {dayLabels[i]}{latest && n > 1 && <span className="t-caption ml-2 !text-accent">Latest</span>}
                    </span>
                    <span className={`num ${v === null ? "text-faint" : latest ? "text-lg font-semibold text-accent" : "text-base text-muted"}`}>
                      {v === null ? "—" : fmtX(v)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </GlassCard>
        );
      })}
      <p className="t-small px-1 text-xs text-faint">
        Exact multiples as published.
        {model.updatedAtLabel && <> Source last updated: {model.updatedAtLabel} IST.</>}
      </p>
    </div>
  );
}

/** The conclusion of the section: total subscription per reported day, the latest one dominant. */
export function SubscriptionTotal({ model }: { model: SubModel }) {
  const t = model.total;
  if (!t) return null;
  const n = model.dayLabels.length;
  return (
    <GlowCard tilt={false} className="enter group p-5 shadow-[0_24px_60px_-34px_color-mix(in_oklab,var(--accent)_70%,transparent)] sm:p-7 lg:p-10" style={css({ "--i": 2, borderColor: "color-mix(in oklab, var(--accent) 28%, var(--border))" })}>
      <div className="grid gap-5 sm:gap-8 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-16">
        <div>
          <p className="t-caption flex items-center gap-2"><Icon name="pie" size={14} className="ico-pop" />Total</p>
          <p className="t-body mt-2 max-w-[16rem] text-[0.875rem] sm:mt-3 sm:text-[1rem]">Overall subscription across every category.</p>
        </div>
        <dl className="flex flex-wrap items-end justify-start gap-x-5 gap-y-4 sm:gap-x-10 sm:gap-y-6 lg:justify-end lg:gap-x-14">
          {model.dayLabels.map((d, i) => {
            const v = t.values[i];
            const latest = i === n - 1;
            return (
              <div key={d} className="min-w-[4.25rem]">
                <dt className="t-caption">{d}</dt>
                <dd className={`t-metric mt-2 origin-left transition-transform duration-300 ${latest ? "text-4xl text-accent group-hover:scale-[1.06] sm:text-5xl lg:text-7xl" : "text-2xl text-muted sm:text-3xl"}`}>
                  {v === null ? <span className="text-xl font-normal text-faint">—</span> : fmtX(v)}
                </dd>
                {latest && n > 1 && (
                  <p className="trend-up t-small mt-2 inline-flex max-w-[6.5rem] items-start gap-1.5 text-[0.75rem] font-medium max-sm:leading-snug text-accent sm:max-w-none sm:items-center sm:text-[0.875rem]"><Icon name="up" size={14} />latest subscription</p>
                )}
              </div>
            );
          })}
        </dl>
      </div>
    </GlowCard>
  );
}
