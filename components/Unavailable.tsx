import { GlassPanel } from "@/components/glass/GlassStatic";
import { Icon } from "@/components/Icon";

export function Unavailable() {
  return (
    <GlassPanel role="alert" className="enter mx-auto max-w-xl p-10 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-warn-soft text-warn"><Icon name="alert" size={22} /></div>
      <h1 className="t-h1 mt-5 !text-2xl">IPO data is temporarily unavailable</h1>
      <p className="t-body mt-3">Our data provider did not respond. Please try again in a few minutes.</p>
    </GlassPanel>
  );
}
