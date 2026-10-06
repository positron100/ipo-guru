import { SITE_NAME } from "@/lib/site";

/**
 * Opening animation: a decorative market-growth line draws itself; its endpoint becomes the origin of a circular reveal
 * that opens the site underneath. It is a server-rendered overlay animated entirely with CSS (see "Opening animation" in
 * globals.css), so it needs no hydration, never blocks the page (the app renders underneath from the first byte) and cannot
 * get stuck: the CSS timeline ends with the overlay hidden even if no JavaScript ever runs. The line is brand decoration only
 * and is not data.
 *
 * Plays on every full page load (first visit and reload), never on client-side navigation (the layout does not remount).
 * Development: `?intro=0` skips it. Reduced motion gets a short fade instead.
 */

/** Runs in <head>, before first paint: decide play / reduced / skip. */
const DEV = process.env.NODE_ENV !== "production";
export const INTRO_HEAD_SCRIPT = `(function(){var d=document.documentElement;try{${
  DEV ? 'if(/[?&]intro=0/.test(location.search)){d.dataset.intro="skip";return}' : ""
}d.dataset.intro=matchMedia("(prefers-reduced-motion: reduce)").matches?"reduced":"play"}catch(e){d.dataset.intro="skip"}})()`;

/**
 * Runs right after the overlay: measure the endpoint (right away, again once layout has settled, and on load / resize; never per frame) to set the reveal origin and the radius that covers the viewport.
 * Any press or key skips. Everything it attaches is removed when the intro is over (or skipped), and a safety timer forces the overlay
 * off after 2.8 s even if CSS animations never run (so it can never be left on screen).
 */
const GEOMETRY_SCRIPT = `(function(){var d=document.documentElement;if(d.dataset.intro!=="play")return;var s=function(){var e=document.getElementById("intro-end");if(!e)return;var r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,w=innerWidth,h=innerHeight;d.style.setProperty("--intro-ox",x+"px");d.style.setProperty("--intro-oy",y+"px");d.style.setProperty("--intro-R",Math.ceil(Math.hypot(Math.max(x,w-x),Math.max(y,h-y))+4)+"px")};var k=function(){d.dataset.intro="skip";z()};var z=function(){removeEventListener("resize",s);removeEventListener("load",s);removeEventListener("pointerdown",k);removeEventListener("keydown",k);clearTimeout(t)};var t=setTimeout(function(){d.dataset.intro="skip";z()},2800);s();requestAnimationFrame(s);setTimeout(s,60);addEventListener("resize",s);addEventListener("load",s);addEventListener("pointerdown",k);addEventListener("keydown",k)})()`;

/** Organic but clearly rising. viewBox 760 x 340; the last point is the reveal origin. */
const LINE =
  "M20 300 C70 296 95 250 140 252 C190 254 205 205 250 196 C300 186 318 232 365 224 C420 214 430 142 490 128 C540 116 560 150 600 132 C650 110 662 64 700 52 C718 47 730 44 742 40";
const TICKS = [90, 170, 250, 330, 410, 490, 570, 650, 730];

export function IntroOverlay() {
  return (
    <>
      <div className="intro-overlay" aria-hidden>
        <div className="intro-stage">
          <p className="intro-label t-caption">{SITE_NAME}</p>
          <svg className="intro-chart" viewBox="0 0 760 340" fill="none">
            <defs>
              <linearGradient id="intro-stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" style={{ stopColor: "var(--accent-2)" }} />
                <stop offset="100%" style={{ stopColor: "var(--accent)" }} />
              </linearGradient>
              <linearGradient id="intro-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.2 }} />
                <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
              </linearGradient>
              <radialGradient id="intro-glow">
                <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.45 }} />
                <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
              </radialGradient>
            </defs>

            <g className="intro-extra intro-grid">
              {[60, 130, 200, 270].map((y) => <line key={y} x1="20" x2="742" y1={y} y2={y} />)}
            </g>
            <g className="intro-extra intro-ticks">
              {TICKS.map((x, i) => <line key={x} x1={x} x2={x} y1="318" y2={i % 2 ? "326" : "332"} style={{ animationDelay: `${0.15 + i * 0.07}s` }} />)}
            </g>

            <path className="intro-area" d={`${LINE} L742 320 L20 320 Z`} fill="url(#intro-fill)" />
            <path className="intro-line" d={LINE} pathLength={1} stroke="url(#intro-stroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            <g className="intro-extra intro-dots">
              <circle cx="190" cy="168" r="2" /><circle cx="330" cy="130" r="1.6" /><circle cx="470" cy="190" r="1.8" />
              <circle cx="600" cy="84" r="1.6" /><circle cx="520" cy="60" r="1.4" />
            </g>

            {/* moving head + soft glow: follow the line with the same timing as the draw (offset-path), transform only */}
            <g className="intro-head" style={{ offsetPath: `path("${LINE}")` }}>
              <circle r="18" fill="url(#intro-glow)" />
              <circle r="4.5" style={{ fill: "var(--accent)" }} />
            </g>

            {/* final point: becomes the origin of the reveal */}
            <circle className="intro-pulse" cx="742" cy="40" r="6" />
            <circle id="intro-end" className="intro-end" cx="742" cy="40" r="5.5" />
          </svg>
        </div>
        <div className="intro-ring" />
      </div>
      <script dangerouslySetInnerHTML={{ __html: GEOMETRY_SCRIPT }} />
    </>
  );
}
