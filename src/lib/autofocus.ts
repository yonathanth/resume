/**
 * Whether a field may take focus on its own when it appears.
 *
 * On a phone or tablet, focusing a field opens the on-screen keyboard, which
 * covers the question being asked and scrolls the step around — so there a
 * field waits to be tapped. With a mouse (hover + fine pointer), jumping
 * straight into the first field is still the helpful thing to do.
 *
 * Use instead of a bare `autoFocus`:  <input autoFocus={canAutoFocus()} />
 * Safe to call during render: these fields only render in the browser after
 * the user opens something, and React applies autoFocus as a focus() call
 * rather than an HTML attribute, so server and client never disagree.
 */
export function canAutoFocus(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  } catch {
    return false;
  }
}
