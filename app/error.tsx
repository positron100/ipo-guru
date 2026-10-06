"use client";
import { GlassPanel } from "@/components/glass/GlassStatic";
import { Icon } from "@/components/Icon";
import { Magnetic } from "@/components/motion/Magnetic";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <GlassPanel role="alert" className="enter mx-auto max-w-xl p-10 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-warn-soft text-warn"><Icon name="alert" size={22} /></div>
      <h1 className="t-h1 mt-5 !text-2xl">IPO data is temporarily unavailable</h1>
      <p className="t-body mt-3">Our data provider did not respond. Nothing is wrong with your connection. Please try again in a minute.</p>
      <div className="mt-8"><Magnetic strength={10}><button type="button" onClick={reset} className="group btn btn-primary !px-7 !py-3.5"><Icon name="arrow" size={16} className="ico-spin" />Try again</button></Magnetic></div>
    </GlassPanel>
  );
}
