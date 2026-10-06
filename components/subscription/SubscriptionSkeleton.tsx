import { GlassPanel } from "@/components/glass/GlassStatic";

const S = ({ className = "" }: { className?: string }) => <div className={`skeleton ${className}`} aria-hidden />;

/** Same structure as the finished section: four cards, the momentum chart, then matrix rows and the total. */
export function SubscriptionSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: 4 }, (_, k) => (
          <div key={k} className={`skeleton h-40 !rounded-[var(--radius-card)] lg:h-44 ${k === 0 ? "col-span-2 lg:col-span-1" : ""}`} aria-hidden />
        ))}
      </div>

      <S className="mb-3 mt-12 h-6 w-56" />
      <S className="mb-6 h-4 w-72 max-w-full" />
      <GlassPanel className="p-6 lg:p-8">
        <div className="mb-6 flex gap-3"><S className="h-11 w-72 !rounded-full" /></div>
        <S className="h-64 w-full lg:h-80" />
      </GlassPanel>

      <S className="mb-5 mt-12 h-6 w-48" />
      <GlassPanel className="p-4 lg:p-5">
        <div className="mb-3 hidden grid-cols-[1.2fr_repeat(3,1fr)] gap-4 px-3 sm:grid"><S className="h-3 w-20" /><S className="ml-auto h-3 w-12" /><S className="ml-auto h-3 w-12" /><S className="ml-auto h-3 w-12" /></div>
        {Array.from({ length: 5 }, (_, k) => (
          <div key={k} className="grid grid-cols-3 items-center gap-2 px-2 py-2.5 sm:grid-cols-[1.2fr_repeat(3,1fr)] sm:gap-4 sm:px-3">
            <S className="col-span-full h-4 w-24 sm:col-auto" /><S className="h-8" /><S className="h-8" /><S className="h-8" />
          </div>
        ))}
      </GlassPanel>
      <S className="mt-5 h-36 !rounded-[var(--radius-card)]" />
    </div>
  );
}
