/** Remounts on every navigation, replaying the CSS page-enter animation (globals.css). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
