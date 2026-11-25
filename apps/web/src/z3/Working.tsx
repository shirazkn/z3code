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

// Claude Code's glyphs. One timer steps every spinner, so a frame paints only when a glyph changes.
const FRAMES = ["·", "✢", "✳", "✶", "✻", "✽"];
const FRAME_MS = 150;
const spinners = new Set<HTMLElement>();
let frame = 0;
let timer: number | null = null;

function spin(element: HTMLElement) {
  spinners.add(element);
  element.textContent = FRAMES[frame]!;
  if (timer === null && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    timer = window.setInterval(() => {
      frame = (frame + 1) % FRAMES.length;
      for (const spinner of spinners) {
        // A spinner in a kept tab would lay out text nobody sees.
        if (spinner.closest("[inert]") === null) spinner.textContent = FRAMES[frame]!;
      }
    }, FRAME_MS);
  }
  return () => {
    spinners.delete(element);
    if (spinners.size > 0 || timer === null) return;
    window.clearInterval(timer);
    timer = null;
  };
}

/** The working row's label: a glyph spinner and one verb per turn, then the stock timer. */
export function Z3Working({ seed, children }: { seed: string | null; children: ReactNode }) {
  return (
    <span data-z3-working>
      <span ref={spin} data-z3-spin aria-hidden />
      {verbFor(seed ?? "")}… {children}
    </span>
  );
}
