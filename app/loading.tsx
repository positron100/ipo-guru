import { CardGridSkeleton, LoadingShell, SectionTitleSkeleton } from "@/components/Skeletons";

/** Home skeleton in the real composition: hero copy + spotlight panel, four stat tiles, then a card grid. */
export default function Loading() {
  const s = (c: string) => <div className={`skeleton ${c}`} aria-hidden />;
  return (
    <LoadingShell>
      <div className="grid gap-8 sm:gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14 xl:gap-20">
        <div className="flex flex-col justify-center gap-6">
          {s("h-9 w-64 max-w-full !rounded-full")}{s("h-24 w-full max-w-xl")}{s("h-5 w-full max-w-md")}{s("h-5 w-3/4 max-w-sm")}
          <div className="flex flex-wrap gap-3 sm:gap-4">{s("h-14 w-44 !rounded-full sm:w-48")}{s("h-12 w-40 !rounded-full sm:h-14 sm:w-44")}</div>
        </div>
        {s("h-[26rem] !rounded-[var(--radius-card)] sm:min-h-[22rem] sm:h-auto")}
      </div>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-14 sm:gap-4 lg:mt-20 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: 4 }, (_, k) => <div key={k} className="skeleton h-[7.5rem] !rounded-[var(--radius-card)] sm:h-36 lg:h-44" aria-hidden />)}
      </div>
      <SectionTitleSkeleton />
      <CardGridSkeleton />
    </LoadingShell>
  );
}
