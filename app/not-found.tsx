import Link from "next/link";
import { GlassPanel } from "@/components/glass/GlassStatic";
import { Magnetic } from "@/components/motion/Magnetic";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <GlassPanel className="enter mx-auto max-w-xl p-10 text-center">
      <div className="t-metric bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-6xl text-transparent">404</div>
      <h1 className="t-h1 mt-4 !text-2xl">IPO not found</h1>
      <p className="t-body mt-3">We have no record of that IPO. It may be misspelt or not yet announced.</p>
      <div className="mt-8"><Magnetic strength={10}><Link className="btn btn-primary !px-7 !py-3.5" href="/ipo-gmp-today">Browse all IPOs <Icon name="arrow" size={16} className="ico-right" /></Link></Magnetic></div>
    </GlassPanel>
  );
}
