import {
  MAX_COLORS,
  MAX_STIRS,
  MAX_TWIRLS,
  INTRO_SECONDS,
  LIFT,
  FIELD,
  COMPOSITE,
  clamp,
  toLab,
  linkProgram,
} from "./grainientShader";
import {
  updateGrainientTouches,
  type StirSample,
  type SpinSample,
  type PointerState,
} from "./grainientTouches";

export interface GrainientSettings {
  colors: string[];
  type: number;
  angle: number;
  bands: number;
  speed: number;
  flow: number;
  scale: number;
  softness: number;
  silk: number;
  grainAmount: number;
  grainSize: number;
  grainAnimated: boolean;
  contrast: number;
  saturation: number;
  variation: number;
  interactive: boolean;
  stir: number;
  clickSwirl: boolean;
  intro: boolean;
  lightMode: boolean;
  dpr?: number;
}

export function mountGrainientWebGL(
  container: HTMLDivElement,
  canvas: HTMLCanvasElement,
  settingsRef: { current: GrainientSettings },
  wakeRef: { current: (() => void) | null }
): (() => void) | undefined {
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) return undefined;

  const field = linkProgram(gl, FIELD);
  const composite = linkProgram(gl, COMPOSITE);
  if (!field || !composite) return undefined;

  const fu = field.uniforms;
  const cu = composite.uniforms;
  const vao = gl.createVertexArray();
  const target = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, target);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const buffer = gl.createFramebuffer();
  const fieldSize = { width: 0, height: 0 };

  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const colorCache = new Map<string, [number, number, number]>();
  const parse = (value: string): [number, number, number] => {
    const key = String(value);
    const cached = colorCache.get(key);
    if (cached) return cached;
    let rgb: [number, number, number] = [0, 0, 0];
    if (probe) {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = "#000000";
      probe.fillStyle = key;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
      rgb = [r / 255, g / 255, b / 255];
    }
    colorCache.set(key, rgb);
    return rgb;
  };

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const view = { width: 1, height: 1, ratio: 1 };
  const ramp = new Float32Array(MAX_COLORS * 3);
  const stirs = new Float32Array(MAX_STIRS * 4);
  const stirWeights = new Float32Array(MAX_STIRS);
  const twirls = new Float32Array(MAX_TWIRLS * 4);
  const trail: StirSample[] = [];
  const spins: SpinSample[] = [];
  const pointer: PointerState = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5, vx: 0, inside: false, fresh: true };
  let paletteKey = "";
  let time = 0;
  let introClock = settingsRef.current.intro && !reduce ? 0 : 1;
  let frameSeed = 0;
  let grainClock = 0;
  let raf = 0;
  let last = 0;
  let visible = true;

  const syncPalette = () => {
    const s = settingsRef.current;
    const key = `${s.colors.join(",")}|${s.lightMode}`;
    if (key === paletteKey) return;
    paletteKey = key;
    const labs = s.colors.map((color) => toLab(parse(color)));
    if (!s.lightMode) {
      labs.forEach((lab, i) => ramp.set(lab, i * 3));
    } else {
      const blank = labs.map(([L]) => Math.abs(L - labs[0][0]) < 0.1);
      const tints = labs.filter((_, i) => !blank[i]).reverse();
      labs.forEach((_, i) => {
        const picked = blank[i] ? ([1, 0, 0] as [number, number, number]) : tints.shift()!;
        const [L, a, b] = picked;
        ramp.set([L + (1 - L) * LIFT, a * (1 - LIFT), b * (1 - LIFT)], i * 3);
      });
    }
  };

  const draw = () => {
    const s = settingsRef.current;
    const aspect = view.width / view.height;
    syncPalette();
    gl.bindVertexArray(vao);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.viewport(0, 0, fieldSize.width, fieldSize.height);
    gl.useProgram(field.program);
    gl.uniform1f(fu.uAspect, aspect);
    gl.uniform1f(fu.uTime, time);
    gl.uniform3fv(fu.uRamp, ramp);
    gl.uniform1i(fu.uCount, s.colors.length);
    const radians = (s.angle * Math.PI) / 180;
    gl.uniform1i(fu.uType, s.type);
    gl.uniform2f(fu.uDir, Math.sin(radians), Math.cos(radians));
    gl.uniform1f(fu.uExtent, aspect * Math.abs(Math.sin(radians)) + Math.abs(Math.cos(radians)));
    gl.uniform1f(fu.uBands, s.bands);
    gl.uniform1f(fu.uSoftness, s.softness);
    gl.uniform1f(fu.uFlow, s.flow);
    gl.uniform1f(fu.uScale, s.scale);
    gl.uniform1f(fu.uSilk, s.silk);
    gl.uniform4fv(fu.uStir, stirs);
    gl.uniform1fv(fu.uStirWeight, stirWeights);
    gl.uniform4fv(fu.uTwirl, twirls);
    gl.uniform2f(fu.uSeed, s.variation * 3.17, s.variation * 1.91);
    gl.uniform1f(fu.uContrast, s.contrast);
    gl.uniform1f(fu.uSaturation, s.saturation);
    gl.uniform1f(fu.uSettle, introClock * introClock * (3 - 2 * introClock));
    gl.uniform1f(fu.uReveal, introClock);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(composite.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.uniform1i(cu.uField, 0);
    gl.uniform1f(cu.uGrain, s.grainAmount);
    gl.uniform1f(cu.uGrainSize, s.grainSize * view.ratio);
    gl.uniform1f(cu.uFrame, frameSeed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const resize = () => {
    const s = settingsRef.current;
    view.width = Math.max(1, container.clientWidth);
    view.height = Math.max(1, container.clientHeight);
    view.ratio = Math.min(s.dpr || window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(view.width * view.ratio));
    canvas.height = Math.max(1, Math.round(view.height * view.ratio));
    const width = Math.max(1, Math.round(canvas.width / 2));
    const height = Math.max(1, Math.round(canvas.height / 2));
    if (width !== fieldSize.width || height !== fieldSize.height) {
      fieldSize.width = width;
      fieldSize.height = height;
      gl.bindTexture(gl.TEXTURE_2D, target);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    draw();
    wake();
  };

  const frame = (now: number) => {
    raf = 0;
    if (!visible || document.hidden) return;
    const s = settingsRef.current;
    const dt = last ? clamp((now - last) / 1000, 0.001, 0.05) : 1 / 60;
    last = now;
    if (!reduce) time += dt * s.speed * 0.16;
    if (introClock < 1) introClock = Math.min(1, introClock + dt / INTRO_SECONDS);
    grainClock += dt;
    if (s.grainAnimated && !reduce && grainClock > 1 / 24) {
      grainClock = 0;
      frameSeed = (frameSeed + 1) % 97;
    }
    updateGrainientTouches(
      dt,
      view.width / view.height,
      reduce,
      s.interactive,
      s.stir,
      pointer,
      trail,
      spins,
      stirs,
      stirWeights,
      twirls
    );
    draw();
    const busy = (!reduce && (s.speed > 0 || s.grainAnimated)) || introClock < 1 || trail.length > 0 || spins.length > 0;
    if (busy) raf = requestAnimationFrame(frame);
    else last = 0;
  };

  function wake() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }

  const locate = (event: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    const x = (event.clientX - rect.left) / Math.max(1, rect.width);
    const y = 1 - (event.clientY - rect.top) / Math.max(1, rect.height);
    pointer.inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    pointer.x = x;
    pointer.y = y;
    if (pointer.fresh || !pointer.inside) { pointer.sx = x; pointer.sy = y; pointer.fresh = false; }
  };

  const onPointerMove = (event: PointerEvent) => { locate(event); if (pointer.inside || trail.length) wake(); };
  const onPointerDown = (event: PointerEvent) => {
    locate(event);
    const s = settingsRef.current;
    if (!pointer.inside || !s.clickSwirl || reduce) return;
    spins.unshift({ x: (pointer.x - 0.5) * (view.width / view.height), y: pointer.y - 0.5, age: 0, direction: pointer.vx < 0 ? 1 : -1 });
    if (spins.length > MAX_TWIRLS) spins.pop();
    wake();
  };
  const onPointerLeave = () => { pointer.inside = false; };
  const onVisibility = () => { last = 0; wake(); };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) { last = 0; wake(); }
  });
  intersection.observe(container);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
  document.addEventListener("visibilitychange", onVisibility);
  resize();
  wakeRef.current = wake;

  return () => {
    cancelAnimationFrame(raf);
    wakeRef.current = null;
    resizeObserver.disconnect();
    intersection.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerdown", onPointerDown);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    document.removeEventListener("visibilitychange", onVisibility);
    gl.deleteTexture(target);
    gl.deleteFramebuffer(buffer);
    gl.deleteVertexArray(vao);
    gl.deleteProgram(field.program);
    gl.deleteProgram(composite.program);
    if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
