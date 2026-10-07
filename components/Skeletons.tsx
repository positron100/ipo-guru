import { GlassCard, GlassPanel } from "@/components/glass/GlassStatic";
import { ScrollTop } from "@/components/nav/ScrollTop";

const S = ({ className = "" }: { className?: string }) => <div className={`skeleton ${className}`} aria-hidden />;

/** Matches IpoCard's footprint so nothing jumps when real cards arrive. */
export const CardSkeleton = () => (
  <GlassCard className="flex flex-col gap-5 p-5 sm:gap-6 sm:p-6 lg:p-7">
    <div className="flex justify-between gap-3"><S className="h-5 w-3/5" /><S className="h-6 w-16 !rounded-full" /></div>
    <div className="flex items-end justify-between"><div className="space-y-2"><S className="h-3 w-10" /><S className="h-10 w-32" /></div><S className="h-5 w-16" /></div>
    <div className="grid grid-cols-3 gap-2 border-t border-line pt-4"><S className="h-9" /><S className="h-9" /><S className="h-9" /></div>
  </GlassCard>
);

export const CardGridSkeleton = ({ n = 6 }: { n?: number }) => (
  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 2xl:grid-cols-4">{Array.from({ length: n }, (_, k) => <CardSkeleton key={k} />)}</div>
);

export const SectionTitleSkeleton = () => <S className="mb-6 mt-12 h-7 w-56 sm:mt-16 lg:mt-24" />;

export const TableSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <GlassPanel className="overflow-hidden">
    <div className="border-b border-line px-4 py-4"><S className="h-3 w-2/3" /></div>
    {Array.from({ length: rows }, (_, k) => (
      <div key={k} className="flex items-center gap-4 border-b border-line px-4 py-4 last:border-0"><S className="h-4 w-1/3" /><S className="ml-auto h-4 w-16" /><S className="h-4 w-14" /><S className="hidden h-4 w-20 sm:block" /></div>
    ))}
  </GlassPanel>
);

/** Market board placeholder: summary strip, filter pills, then rows shaped like the real ones. */
export const BoardSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div>
    <div className="skeleton h-[17.5rem] !rounded-[var(--radius-panel)] sm:h-44 lg:h-24" aria-hidden />
    <div className="mt-6 flex gap-2 sm:hidden"><S className="h-11 flex-1 !rounded-full" /><S className="h-11 flex-1 !rounded-full" /></div>
    <div className="mt-8 hidden gap-3 sm:flex"><S className="h-12 w-80 !rounded-full" /><S className="h-12 w-56 !rounded-full" /><S className="ml-auto h-11 w-40 !rounded-full" /></div>
    <div className="mt-8 space-y-3 sm:mt-10">
      {Array.from({ length: rows }, (_, k) => <div key={k} className="skeleton h-[13.5rem] !rounded-[var(--radius-card)] lg:h-28" aria-hidden />)}
    </div>
  </div>
);

/** Whole-page loading shell: sr-only status keeps it announced without a visible "Loading...". */
export const LoadingShell = ({ children }: { children: React.ReactNode }) => (
  <div role="status" aria-live="polite" aria-busy="true">
    <ScrollTop />
    <span className="sr-only">Loading IPO data</span>
    {children}
  </div>
);

export const HeaderSkeleton = () => (
  <div className="mt-5 space-y-4"><S className="h-3 w-40" /><S className="h-10 w-2/3 max-w-lg" /><S className="h-4 w-full max-w-xl" /><S className="h-4 w-4/5 max-w-lg" /></div>
);
