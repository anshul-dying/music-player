"use client";

import React, { useEffect, useId, useRef } from "react";
import { cn } from "../utils/cn";

export interface DustGrainBackdropProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of subtle drifting dust motes (default: 48). */
  density?: number;
  /** Opacity of the analog film-grain texture (default: 0.045). */
  grainOpacity?: number;
  /** Maximum opacity of individual dust motes (default: 0.35). */
  particleOpacity?: number;
  /** Animate dust drift (respects OS prefers-reduced-motion). */
  animated?: boolean;
}

interface DustMote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;
}

/**
 * DustGrainBackdrop: Analog film-grain texture + gently drifting dust motes
 * for atmospheric depth on OLED/dark canvases. Respects prefers-reduced-motion.
 */
export const DustGrainBackdrop: React.FC<DustGrainBackdropProps> = ({
  className,
  density = 48,
  grainOpacity = 0.045,
  particleOpacity = 0.35,
  animated = true,
  style,
  ...props
}) => {
  const filterId = useId().replace(/:/g, "");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionQuery =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    let prefersReduced = motionQuery?.matches ?? false;

    let animId = 0;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth || 1280);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight || 720);

    const createMotes = (w: number, h: number): DustMote[] =>
      Array.from({ length: density }, (_, i) => {
        const seed = (i * 9301 + 49297) % 233280;
        const n1 = seed / 233280;
        const n2 = ((seed * 7 + 13) % 233280) / 233280;
        const n3 = ((seed * 13 + 37) % 233280) / 233280;
        return {
          x: n1 * w,
          y: n2 * h,
          r: 0.6 + n3 * 1.4,
          vx: (n1 - 0.5) * 0.14,
          vy: -0.08 - n2 * 0.16,
          alpha: (0.25 + n3 * 0.75) * particleOpacity,
          phase: n1 * Math.PI * 2,
        };
      });

    let motes = createMotes(width, height);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
      motes = createMotes(width, height);
      if (!animated || prefersReduced) drawFrame(0);
    };

    const drawFrame = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      for (const m of motes) {
        if (animated && !prefersReduced) {
          m.x = (m.x + m.vx + width) % width;
          m.y = (m.y + m.vy + height) % height;
        }
        const twinkle = animated && !prefersReduced ? 0.7 + 0.3 * Math.sin(t * 0.0012 + m.phase) : 1;
        ctx.globalAlpha = m.alpha * twinkle;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    let t = 0;
    const loop = () => {
      drawFrame(t);
      t += 16;
      if (animated && !prefersReduced) {
        animId = requestAnimationFrame(loop);
      }
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReduced = e.matches;
      cancelAnimationFrame(animId);
      if (animated && !prefersReduced) {
        animId = requestAnimationFrame(loop);
      } else {
        drawFrame(t);
      }
    };

    window.addEventListener("resize", handleResize);
    motionQuery?.addEventListener("change", handleMotionChange);
    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      motionQuery?.removeEventListener("change", handleMotionChange);
    };
  }, [density, particleOpacity, animated]);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none relative overflow-hidden w-full h-full", className)}
      style={style}
      {...props}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <svg
        className="absolute inset-0 h-full w-full mix-blend-overlay"
        style={{ opacity: grainOpacity }}
      >
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves={3}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </div>
  );
};
