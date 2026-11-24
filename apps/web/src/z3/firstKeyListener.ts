// No imports: main.tsx loads this first, so this is the first window keydown listener and a
// z3 mode sees every key before any stock listener.
let handler: ((event: KeyboardEvent) => void) | null = null;

export function setFirstKeyHandler(next: (event: KeyboardEvent) => void): void {
  handler = next;
}

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (event) => handler?.(event), true);
}
