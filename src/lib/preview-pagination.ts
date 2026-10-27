/**
 * Splits the editor's live preview into A4 pages, the way Chromium breaks the
 * PDF: content that would cross a page's bottom margin moves to the next page,
 * entries marked `break-inside: avoid` move whole, a heading marked
 * `break-after: avoid` moves with what follows it, and a paragraph splits
 * between lines (keeping 2 lines on each side). Each page then starts below
 * the template's @page top margin.
 *
 * The preview HTML is one tall sheet (`body.preview .page`); this inserts
 * spacers into it, so the PDF itself is untouched. It is a close imitation,
 * not Chromium's print layout: unusual layouts (sidebars) may differ by a line.
 */

/** 297mm in CSS px. */
export const A4_PAGE_HEIGHT = (297 * 96) / 25.4;
/** The gray strip drawn between two pages — at most this, and never wider than the page margins it sits on. */
const MAX_PAGE_GAP = 16;

const UNIT_PX: Record<string, number> = { px: 1, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, pt: 96 / 72, pc: 16 };

function toPx(value: string): number | null {
  const m = /^(-?[\d.]+)([a-z]*)$/.exec(value.trim());
  if (!m) return null;
  const n = Number(m[1]);
  if (!m[2]) return n === 0 ? 0 : null;
  const unit = UNIT_PX[m[2]];
  return unit === undefined ? null : n * unit;
}

/** The template's @page margins (top/bottom), and `@page :first`'s top if it has one. */
function pageMargins(doc: Document): { top: number; bottom: number; firstTop: number | null } {
  const margins = { top: 0, bottom: 0, firstTop: null as number | null };
  for (const sheet of Array.from(doc.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!rule.cssText.startsWith("@page")) continue;
      const page = rule as CSSPageRule;
      const top = toPx(page.style.marginTop);
      const bottom = toPx(page.style.marginBottom);
      if (page.selectorText === "") {
        if (top !== null) margins.top = top;
        if (bottom !== null) margins.bottom = bottom;
      } else if (page.selectorText === ":first" && top !== null) {
        margins.firstTop = top;
      }
    }
  }
  return margins;
}

interface Inset {
  top: number;
  bottom: number;
}

type CaretDoc = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

function caretAt(doc: Document, x: number, y: number): { node: Node; offset: number } | null {
  const d = doc as CaretDoc;
  if (d.caretPositionFromPoint) {
    const pos = d.caretPositionFromPoint(x, y);
    return pos ? { node: pos.offsetNode, offset: pos.offset } : null;
  }
  const range = d.caretRangeFromPoint?.(x, y);
  return range ? { node: range.startContainer, offset: range.startOffset } : null;
}

export function paginatePreview(doc: Document): void {
  const view = doc.defaultView;
  const sheet = doc.querySelector<HTMLElement>(".page");
  if (!view || !sheet || sheet.dataset.paginated) return;
  sheet.dataset.paginated = "true";

  const margins = pageMargins(doc);
  const style = (el: Element) => view.getComputedStyle(el);
  const sheetTop = () => sheet.getBoundingClientRect().top;
  const contentTop = (page: number, inset: Inset) =>
    page * A4_PAGE_HEIGHT + (page === 0 ? margins.firstTop ?? margins.top : margins.top) + inset.top;
  const contentBottom = (page: number, inset: Inset) => (page + 1) * A4_PAGE_HEIGHT - margins.bottom - inset.bottom;

  const spacer = (height: number, inline = false) => {
    const el = doc.createElement(inline ? "span" : "div");
    el.setAttribute("data-page-gap", "");
    el.style.cssText = `display:block;height:${Math.max(0, height)}px;margin:0;padding:0;border:0;flex:none;`;
    return el;
  };

  const visibleChildren = (el: Element): HTMLElement[] =>
    Array.from(el.children).filter((c): c is HTMLElement => {
      if (c.namespaceURI !== "http://www.w3.org/1999/xhtml" || c.hasAttribute("data-page-gap")) return false;
      const s = style(c);
      return s.display !== "none" && s.position !== "absolute" && s.position !== "fixed";
    });

  /** Children laid out side by side (flex row, grid columns, floats). */
  const isSideBySide = (el: HTMLElement): boolean => {
    const rects = visibleChildren(el).map((c) => c.getBoundingClientRect()).filter((r) => r.height > 0);
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++)
        if (rects[i].top < rects[j].bottom - 1 && rects[j].top < rects[i].bottom - 1 && Math.abs(rects[i].left - rects[j].left) > 1) return true;
    return false;
  };

  const isLeaf = (el: HTMLElement): boolean =>
    visibleChildren(el).every((c) => style(c).display.startsWith("inline"));

  const avoidsBreakInside = (el: HTMLElement): boolean => {
    const s = style(el);
    return s.breakInside === "avoid" || s.breakInside === "avoid-page" || s.getPropertyValue("page-break-inside") === "avoid";
  };

  const avoidsBreakAfter = (el: Element): boolean => {
    const s = style(el);
    return s.breakAfter === "avoid" || s.breakAfter === "avoid-page" || /^H[1-6]$/.test(el.tagName);
  };

  /** Moves `el` down to `target` (sheet px). A heading kept with it moves along. */
  const pushTo = (el: HTMLElement, target: number) => {
    let anchor: Element = el;
    // Climb while `el` opens its container, to find the heading right before it.
    let opener: Element = el;
    while (!opener.previousElementSibling && opener.parentElement && opener.parentElement !== sheet) opener = opener.parentElement;
    const prev = opener.previousElementSibling;
    if (prev && !prev.hasAttribute("data-page-gap") && avoidsBreakAfter(prev)) {
      const prevTop = prev.getBoundingClientRect().top - sheetTop();
      const elTop = el.getBoundingClientRect().top - sheetTop();
      // Only when the heading is on the same page and short.
      if (Math.floor(prevTop / A4_PAGE_HEIGHT) === Math.floor(elTop / A4_PAGE_HEIGHT) && elTop - prevTop < A4_PAGE_HEIGHT / 4) anchor = prev;
    }
    const top = anchor.getBoundingClientRect().top - sheetTop();
    anchor.parentElement?.insertBefore(spacer(target - top), anchor);
  };

  /** Line boxes of a leaf block, in sheet px. */
  const lineBoxes = (el: HTMLElement): { top: number; bottom: number; left: number }[] => {
    const range = doc.createRange();
    range.selectNodeContents(el);
    const offset = sheetTop();
    const lines: { top: number; bottom: number; left: number }[] = [];
    for (const r of Array.from(range.getClientRects())) {
      if (r.height === 0 || r.width === 0) continue;
      const top = r.top - offset;
      const bottom = r.bottom - offset;
      const line = lines.find((l) => top < l.bottom - 1 && bottom > l.top + 1);
      if (line) {
        line.top = Math.min(line.top, top);
        line.bottom = Math.max(line.bottom, bottom);
        line.left = Math.min(line.left, r.left);
      } else {
        lines.push({ top, bottom, left: r.left });
      }
    }
    return lines.sort((a, b) => a.top - b.top);
  };

  /** Breaks a paragraph between lines; false if it should move whole instead. */
  const splitLines = (el: HTMLElement, limit: number, target: number): boolean => {
    const lines = lineBoxes(el);
    let k = lines.findIndex((l) => l.bottom > limit + 0.5);
    if (k < 0) return true;
    if (lines.length - k < 2) k = lines.length - 2; // widows
    if (k < 2) return false; // orphans
    const line = lines[k];
    const caret = caretAt(doc, line.left + 1, sheetTop() + (line.top + line.bottom) / 2);
    if (!caret || !el.contains(caret.node)) return false;
    const gap = spacer(target - line.top, true);
    if (caret.node.nodeType === Node.TEXT_NODE) {
      const rest = (caret.node as Text).splitText(caret.offset);
      rest.parentNode?.insertBefore(gap, rest);
    } else {
      caret.node.insertBefore(gap, caret.node.childNodes[caret.offset] ?? null);
    }
    return true;
  };

  const walk = (container: HTMLElement, inset: Inset, depth: number) => {
    if (depth > 40) return;
    for (const child of visibleChildren(container)) {
      const offset = sheetTop();
      const rect = child.getBoundingClientRect();
      if (rect.height === 0) continue;
      const top = rect.top - offset;
      const bottom = rect.bottom - offset;
      const page = Math.max(0, Math.floor((top + 0.5) / A4_PAGE_HEIGHT));
      const room = contentBottom(page, inset) - contentTop(page, inset);

      // Starts in a later page's top margin (e.g. after a split above it).
      if (page > 0 && top < contentTop(page, inset) - 1 && bottom - top <= room) {
        pushTo(child, contentTop(page, inset));
        continue;
      }
      if (bottom <= contentBottom(page, inset) + 1) continue;

      const next = contentTop(page + 1, inset);
      const fits = bottom - top <= room;
      const sideBySide = isSideBySide(child);
      if (fits && (avoidsBreakInside(child) || (sideBySide && bottom - top < room / 2) || ["IMG", "HR", "TR"].includes(child.tagName))) {
        pushTo(child, next);
      } else if (isLeaf(child)) {
        if (!splitLines(child, contentBottom(page, inset), next) && fits) pushTo(child, next);
      } else {
        const s = style(child);
        const clone = (s.getPropertyValue("box-decoration-break") || s.getPropertyValue("-webkit-box-decoration-break")) === "clone";
        const childInset = clone
          ? {
              top: inset.top + parseFloat(s.paddingTop) + parseFloat(s.borderTopWidth),
              bottom: inset.bottom + parseFloat(s.paddingBottom) + parseFloat(s.borderBottomWidth),
            }
          : inset;
        walk(child, childInset, depth + 1);
      }
    }
  };

  walk(sheet, { top: 0, bottom: 0 }, 0);

  // Fill out the last page and draw the gaps between pages.
  const height = sheet.getBoundingClientRect().height;
  const pages = Math.max(1, Math.ceil((height - 1) / A4_PAGE_HEIGHT));
  sheet.style.minHeight = `${pages * A4_PAGE_HEIGHT}px`;
  if (style(sheet).position === "static") sheet.style.position = "relative";
  const desk = style(doc.body).backgroundColor;
  // Centered on the break, so half of it lies on each page's margin. Edge-to-edge
  // templates (no margin) print right up to the break, so they get a thin line.
  const gap = Math.max(2, Math.min(MAX_PAGE_GAP, 2 * Math.min(margins.top, margins.bottom)));
  for (let n = 1; n < pages; n++) {
    const band = doc.createElement("div");
    band.setAttribute("data-page-gap", "");
    band.setAttribute("aria-hidden", "true");
    band.style.cssText = `position:absolute;left:-12px;right:-12px;top:${n * A4_PAGE_HEIGHT - gap / 2}px;height:${gap}px;background:${desk};box-shadow:0 0 4px rgba(0,0,0,0.25);z-index:2147483646;pointer-events:none;`;
    sheet.appendChild(band);
  }
}
