"use client";

import React, { useEffect, useRef } from "react";
import styles from "../HomePage.module.css";

/** Must match .grid's background-size in HomePage.module.css. */
const CELL = 56;
/** How far from the pointer cells light up, in cells. */
const RADIUS = 2.6;
/** How much of its light a cell keeps each frame once the pointer moves on (~1.5s to fade: a long trail). */
const DECAY = 0.965;
const LINE = [255, 94, 31] as const;

/**
 * The hero's line grid, with cells that light up around the mouse and fade
 * out behind it, so the lit patch trails the pointer. Drawn on a canvas over
 * the CSS grid; it only animates while something is lit. Mouse and trackpad
 * only — touch screens get the plain grid.
 */
export function HeroGrid() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let width = 0;
    let height = 0;
    let originX = 0;
    let cols = 0;
    let rows = 0;
    let light = new Float32Array(0);
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // "background-position: center" centers a tile, so the lines sit at (width - CELL) / 2, every CELL.
      originX = ((((width - CELL) / 2) % CELL) + CELL) % CELL;
      cols = Math.ceil((width - originX) / CELL) + 1;
      rows = Math.ceil(height / CELL) + 1;
      light = new Float32Array(cols * rows);
    };

    const tick = () => {
      frame = 0;
      let lit = false;
      for (let i = 0; i < light.length; i++) {
        light[i] *= DECAY;
        if (light[i] < 0.01) light[i] = 0;
      }
      // Light the cells near the pointer, brightest at its center.
      if (pointer) {
        const reach = RADIUS * CELL;
        const c0 = Math.max(0, Math.floor((pointer.x - originX - reach) / CELL) + 1);
        const c1 = Math.min(cols - 1, Math.floor((pointer.x - originX + reach) / CELL) + 1);
        const r0 = Math.max(0, Math.floor((pointer.y - reach) / CELL));
        const r1 = Math.min(rows - 1, Math.floor((pointer.y + reach) / CELL));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const cx = originX + (c - 1) * CELL + CELL / 2;
            const cy = r * CELL + CELL / 2;
            const d = Math.hypot(cx - pointer.x, cy - pointer.y) / reach;
            if (d >= 1) continue;
            const strength = Math.pow(1 - d, 0.6);
            const i = r * cols + c;
            if (strength > light[i]) light[i] = strength;
          }
        }
      }

      ctx.clearRect(0, 0, width, height);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = light[r * cols + c];
          if (!v) continue;
          lit = true;
          const x = originX + (c - 1) * CELL;
          const y = r * CELL;
          ctx.fillStyle = `rgba(${LINE[0]}, ${LINE[1]}, ${LINE[2]}, ${0.1 * v})`;
          ctx.fillRect(x, y, CELL, CELL);
          ctx.strokeStyle = `rgba(${LINE[0]}, ${LINE[1]}, ${LINE[2]}, ${0.85 * v})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, CELL, CELL);
        }
      }
      // Runs while the pointer is over the hero or a trail is still fading; then it stops.
      if (lit || pointer) frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = root.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointer = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height ? { x, y } : null;
      wake();
    };
    // Left the page or scrolled: let the trail fade out.
    const onLeave = () => {
      pointer = null;
      wake();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onLeave, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onLeave);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.heroGrid}>
      <div className={styles.grid} />
      <canvas ref={canvasRef} className={styles.gridCanvas} aria-hidden="true" />
    </div>
  );
}
