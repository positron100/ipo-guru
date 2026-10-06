/** Minimal robots.txt support: Disallow/Allow rules of the "*" group, with "*" wildcards and "$" end anchors. */
export interface RobotsRules {
  disallow: RegExp[];
  allow: RegExp[];
}

const toRegex = (pattern: string): RegExp => {
  const esc = pattern.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${esc.endsWith("$") ? esc.slice(0, -1) + "$" : esc}`);
};

export function parseRobots(text: string): RobotsRules {
  const rules: RobotsRules = { disallow: [], allow: [] };
  let inStar = false;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      inStar = lastWasAgent ? inStar || value === "*" : value === "*";
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!inStar || !value) continue;
    if (key === "disallow") rules.disallow.push(toRegex(value));
    else if (key === "allow") rules.allow.push(toRegex(value));
  }
  return rules;
}

/** Longest-match wins (Allow beats Disallow on ties), as in the robots.txt standard. */
export function isAllowed(rules: RobotsRules, path: string): boolean {
  const longest = (rs: RegExp[]) => Math.max(-1, ...rs.filter((r) => r.test(path)).map((r) => r.source.length));
  const d = longest(rules.disallow);
  return d < 0 || longest(rules.allow) >= d;
}

export function demo() {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  const r = parseRobots(`User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\nDisallow: /wp-json/*\nDisallow: /*/comment*\n\nUser-agent: Other\nDisallow: /\n`);
  assert(isAllowed(r, "/vishal-nirmiti-ipo/"), "ipo page allowed");
  assert(!isAllowed(r, "/wp-admin/x.php") && isAllowed(r, "/wp-admin/admin-ajax.php"), "allow overrides");
  assert(!isAllowed(r, "/wp-json/wp/v2/posts") && !isAllowed(r, "/x-ipo/comments"), "wildcards");
  assert(isAllowed(parseRobots(""), "/anything"), "empty robots allows");
  assert(isAllowed(r, "/"), "other agent group ignored");
}
