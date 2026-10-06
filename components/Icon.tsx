const PATHS = {
  tag: "M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Zm5-5.5h.01",
  layers: "M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 17.5 12 22l9-4.5",
  pie: "M21 12a9 9 0 1 1-9-9v9h9ZM15 3.5A9 9 0 0 1 20.5 9H15V3.5Z",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  rupee: "M6 4h12M6 9h12M9 4c5 0 6 5 0 5l7 11",
  info: "M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  alert: "M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  flat: "M5 12h14",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  "alert-circle": "M12 8v4M12 16h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  copy: "M9 9h11v11H9zM5 15V5h10",
  clock: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`ico ${className}`}>
      <path d={PATHS[name]} />
    </svg>
  );
}
