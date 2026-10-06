import { dateOnly } from "@/lib/format";
import { istToday } from "@/lib/ipoguru-normalize";
import { GlassPanel } from "@/components/glass/GlassStatic";

type Stage = { label: string; date: string | null };
type State = "done" | "current" | "next" | "unknown";

/** Stages are compared on IST calendar days (dates arrive as YYYY-MM-DD or midnight-UTC ISO of that day). */
export function Timeline({ stages }: { stages: readonly Stage[] }) {
  const today = istToday();
  const day = (d: string | null) => d?.slice(0, 10) ?? null;
  const firstFuture = stages.findIndex((s) => day(s.date) !== null && day(s.date)! >= today);
  const states: State[] = stages.map((s, i) => {
    const d = day(s.date);
    if (d === null) return "unknown";
    if (d < today) return "done";
    return i === firstFuture ? "current" : "next";
  });
  const lastDone = states.lastIndexOf("done");
  const reached = states.includes("current") ? states.indexOf("current") : lastDone;
  const progress = reached < 0 ? 0 : (reached / (stages.length - 1)) * 100;

  return (
    <GlassPanel className="p-7 sm:p-9 lg:p-12">
      <ol className="relative grid gap-8 md:grid-cols-6 md:gap-0">
        {/* vertical rail (mobile) */}
        <div className="absolute bottom-3 left-[11px] top-3 w-px bg-line md:hidden" aria-hidden />
        <div className="absolute left-[11px] top-3 w-px bg-accent md:hidden" style={{ height: `calc(${progress}% - 0px)`, transformOrigin: "top" }} aria-hidden />
        {/* horizontal rail (md+): spans first to last marker centre */}
        <div className="absolute left-[calc(100%/12)] right-[calc(100%/12)] top-[11px] hidden h-px bg-line md:block" aria-hidden />
        <div className="absolute left-[calc(100%/12)] top-[11px] hidden h-px md:block" style={{ width: `calc((100% - 100%/6) * ${progress / 100})` }} aria-hidden>
          <div className="bar-grow h-full w-full bg-accent" />
        </div>

        {stages.map((s, i) => {
          const st = states[i];
          return (
            <li key={s.label} className="enter relative flex items-start gap-4 md:flex-col md:items-center md:gap-3 md:text-center" style={{ "--i": i } as React.CSSProperties} aria-current={st === "current" ? "step" : undefined}>
              <span
                className={`relative z-10 grid size-[23px] shrink-0 place-items-center rounded-full border-2 transition-colors ${
                  st === "done" ? "border-accent bg-accent text-accent-fg"
                  : st === "current" ? "border-accent bg-bg"
                  : st === "next" ? "border-line-strong bg-bg"
                  : "border-dashed border-line-strong bg-bg"}`}
              >
                {st === "done" && (
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5 9-9" /></svg>
                )}
                {st === "current" && <span className="live-dot text-accent" aria-hidden />}
              </span>
              <div>
                <div className={`text-base font-semibold ${st === "unknown" ? "text-faint" : ""}`}>{s.label}</div>
                <div className={`num t-small mt-1 ${st === "current" ? "font-medium text-accent" : "text-faint"}`}>
                  {dateOnly(s.date) ?? "Not announced"}
                </div>
                <span className="sr-only">{st === "done" ? "Completed" : st === "current" ? "Next stage" : st === "next" ? "Upcoming" : ""}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </GlassPanel>
  );
}
