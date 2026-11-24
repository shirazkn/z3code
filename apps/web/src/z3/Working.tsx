import type { ReactNode } from "react";

const VERBS = [
  "Pondering",
  "Tinkering",
  "Noodling",
  "Brewing",
  "Percolating",
  "Mulling",
  "Conjuring",
  "Wrangling",
  "Simmering",
  "Untangling",
  "Whittling",
  "Puzzling",
];

function verbFor(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return VERBS[Math.abs(hash) % VERBS.length]!;
}

/** The working row's label: a glyph spinner and one verb per turn, then the stock timer. */
export function Z3Working({ seed, children }: { seed: string | null; children: ReactNode }) {
  return (
    <span data-z3-working>
      <span data-z3-spin aria-hidden />
      {verbFor(seed ?? "")}… {children}
    </span>
  );
}
