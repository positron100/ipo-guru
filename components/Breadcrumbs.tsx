import Link from "next/link";

export function Breadcrumbs({ items }: { items: { name: string; path?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="enter t-small text-faint">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, k) => (
          <li key={k} className="flex items-center gap-1.5">
            {it.path ? <Link href={it.path} className="link hit-text">{it.name}</Link> : <span aria-current="page" className="font-medium text-muted">{it.name}</span>}
            {k < items.length - 1 && <span aria-hidden className="text-line-strong">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
