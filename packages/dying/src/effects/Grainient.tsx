"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "../utils/cn";
import { MAX_COLORS, DEFAULT_COLORS, TYPES, clamp } from "./grainientShader";
import { mountGrainientWebGL, type GrainientSettings } from "./grainientEngine";

export interface GrainientProps extends React.HTMLAttributes<HTMLDivElement> {
  colors?: string[];
  type?: "linear" | "radial" | string;
  angle?: number;
  bands?: number;
  speed?: number;
  flow?: number;
  scale?: number;
  softness?: number;
  silk?: number;
  grainAmount?: number;
  grainSize?: number;
  grainAnimated?: boolean;
  contrast?: number;
  saturation?: number;
  variation?: number;
  interactive?: boolean;
  stir?: number;
  clickSwirl?: boolean;
  intro?: boolean;
  lightMode?: boolean;
  dpr?: number;
}

export const Grainient: React.FC<GrainientProps> = ({
  colors = DEFAULT_COLORS,
  type = "linear",
  angle = 55,
  bands = 1,
  speed = 1,
  flow = 0.8,
  scale = 1,
  softness = 1,
  silk = 0.35,
  grainAmount = 0.08,
  grainSize = 1.2,
  grainAnimated = true,
  contrast = 1,
  saturation = 1,
  variation = 0,
  interactive = true,
  stir = 1,
  clickSwirl = true,
  intro = true,
  lightMode = false,
  dpr,
  className = "",
  style,
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const palette = (Array.isArray(colors) && colors.length ? colors : DEFAULT_COLORS).slice(0, MAX_COLORS);
  const settings: GrainientSettings = {
    colors: palette.length > 1 ? palette : [palette[0], palette[0]],
    type: TYPES[type] ?? 0,
    angle,
    bands: clamp(bands, 1, 8),
    speed: Math.max(0, speed),
    flow: clamp(flow, 0, 3),
    scale: clamp(scale, 0.25, 3),
    softness: clamp(softness, 0, 1),
    silk: clamp(silk, 0, 1),
    grainAmount: clamp(grainAmount, 0, 0.5),
    grainSize: clamp(grainSize, 0.5, 4),
    grainAnimated,
    contrast: clamp(contrast, 0.2, 2),
    saturation: clamp(saturation, 0, 2),
    variation: Math.max(0, variation),
    interactive,
    stir: clamp(stir, 0, 2),
    clickSwirl,
    intro,
    lightMode,
    dpr,
  };
  const settingsRef = useRef<GrainientSettings>(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;
    return mountGrainientWebGL(container, canvas, settingsRef, wakeRef);
  }, []);

  useEffect(() => {
    wakeRef.current?.();
  });

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={style}
      {...rest}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />
    </div>
  );
};

export default Grainient;
