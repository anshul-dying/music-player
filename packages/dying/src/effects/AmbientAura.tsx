"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "../utils/cn";

export interface AmbientAuraProps extends React.HTMLAttributes<HTMLDivElement> {
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  intensity?: number; // 0 to 1
  blur?: number; // blur radius in px
  animated?: boolean;
}

interface Orb {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
}

function resolveCanvasColor(colorStr: string, element?: HTMLElement | null): string {
  if (!colorStr) return "rgba(0, 0, 0, 0)";
  if (colorStr.startsWith("var(")) {
    if (typeof window !== "undefined" && element) {
      const match = colorStr.match(/var\((--[^,\s)]+)(?:,\s*([^)]+))?\)/);
      if (match) {
        const varName = match[1];
        const fallback = match[2];
        const computed = getComputedStyle(element).getPropertyValue(varName).trim();
        if (computed) return computed;
        if (fallback) return resolveCanvasColor(fallback.trim(), element);
      }
    }
    const fallbackMatch = colorStr.match(/,\s*([^)]+)\)/);
    if (fallbackMatch) return fallbackMatch[1].trim();
  }
  return colorStr;
}

export const AmbientAura: React.FC<AmbientAuraProps> = ({
  className,
  children,
  primaryColor = "#7c3aed",
  secondaryColor = "#2563eb",
  tertiaryColor = "#db2777",
  intensity = 0.55,
  blur = 120,
  animated = true,
  style,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync CSS variables with container so children/siblings can read --dying-aura-*
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty("--dying-aura-primary", primaryColor);
      containerRef.current.style.setProperty("--dying-aura-secondary", secondaryColor);
      containerRef.current.style.setProperty("--dying-aura-tertiary", tertiaryColor);
    }
  }, [primaryColor, secondaryColor, tertiaryColor]);

  // Smooth Canvas 2D ambient aura
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number | undefined;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const reducedMotionQuery =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    let shouldAnimate = animated && !(reducedMotionQuery?.matches ?? false);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    const orbs: Orb[] = [
      {
        x: width * 0.35,
        y: height * 0.35,
        radius: Math.max(width, height) * 0.5,
        vx: 0.25,
        vy: 0.18,
        color: primaryColor,
        alpha: intensity * 0.7,
      },
      {
        x: width * 0.65,
        y: height * 0.6,
        radius: Math.max(width, height) * 0.55,
        vx: -0.2,
        vy: -0.22,
        color: secondaryColor,
        alpha: intensity * 0.6,
      },
      {
        x: width * 0.5,
        y: height * 0.75,
        radius: Math.max(width, height) * 0.45,
        vx: 0.15,
        vy: -0.15,
        color: tertiaryColor,
        alpha: intensity * 0.45,
      },
    ];

    let t = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw each aura orb with radial falloff
      const resolvedPrimary = resolveCanvasColor(primaryColor, containerRef.current);
      const resolvedSecondary = resolveCanvasColor(secondaryColor, containerRef.current);
      const resolvedTertiary = resolveCanvasColor(tertiaryColor, containerRef.current);

      orbs[0].color = resolvedPrimary;
      orbs[1].color = resolvedSecondary;
      orbs[2].color = resolvedTertiary;

      orbs.forEach((orb, i) => {
        if (shouldAnimate) {
          orb.x += Math.sin(t * 0.001 + i) * orb.vx * 2;
          orb.y += Math.cos(t * 0.0012 + i) * orb.vy * 2;
        }

        const gradient = ctx.createRadialGradient(
          orb.x,
          orb.y,
          0,
          orb.x,
          orb.y,
          orb.radius
        );

        ctx.globalAlpha = orb.alpha;
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(0.5, orb.color);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      t += 16;
      if (shouldAnimate) {
        animId = requestAnimationFrame(render);
      }
    };

    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      shouldAnimate = animated && !event.matches;
      if (!shouldAnimate && animId !== undefined) {
        cancelAnimationFrame(animId);
        animId = undefined;
      } else if (shouldAnimate && animId === undefined) {
        animId = requestAnimationFrame(render);
      }
    };

    reducedMotionQuery?.addEventListener("change", handleReducedMotionChange);
    render();

    return () => {
      if (animId !== undefined) {
        cancelAnimationFrame(animId);
      }
      reducedMotionQuery?.removeEventListener("change", handleReducedMotionChange);
      window.removeEventListener("resize", handleResize);
    };
  }, [primaryColor, secondaryColor, tertiaryColor, intensity, animated]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden w-full h-full", className)}
      style={style}
      {...props}
    >
      {/* Background canvas with high blur filter for ultra-soft aura light */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-90 transition-opacity duration-1000"
        style={{
          filter: `blur(${blur}px) saturate(180%)`,
          transform: "scale(1.2)",
        }}
      >
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>

      {/* Children content floating above aura */}
      {children}
    </div>
  );
};
