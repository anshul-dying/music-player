import { MAX_STIRS, MAX_TWIRLS, STIR_LIFE, STIR_STEP, TWIRL_LIFE } from "./grainientShader";

export interface StirSample {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  grow: number;
  done: boolean;
}

export interface SpinSample {
  x: number;
  y: number;
  age: number;
  direction: number;
}

export interface PointerState {
  x: number;
  y: number;
  sx: number;
  sy: number;
  vx: number;
  inside: boolean;
  fresh: boolean;
}

export function updateGrainientTouches(
  dt: number,
  aspect: number,
  reduce: boolean,
  interactive: boolean,
  stirStrength: number,
  pointer: PointerState,
  trail: StirSample[],
  spins: SpinSample[],
  stirs: Float32Array,
  stirWeights: Float32Array,
  twirls: Float32Array
): void {
  const follow = 1 - Math.exp(-dt / 0.06);
  const px = pointer.sx;
  const py = pointer.sy;
  pointer.sx += (pointer.x - pointer.sx) * follow;
  pointer.sy += (pointer.y - pointer.sy) * follow;
  const vx = ((pointer.sx - px) / dt) * aspect;
  const vy = (pointer.sy - py) / dt;
  pointer.vx = vx;

  const head = trail[0];
  trail.forEach((sample) => { if (sample.done) sample.age += dt; });

  if (interactive && pointer.inside && Math.hypot(vx, vy) > 0.02 && !reduce) {
    if (!head || head.done) {
      trail.unshift({ x: 0, y: 0, vx: 0, vy: 0, age: 0, grow: 0, done: false });
      if (trail.length > MAX_STIRS) trail.pop();
    }
    const live = trail[0];
    live.x = (pointer.sx - 0.5) * aspect;
    live.y = pointer.sy - 0.5;
    live.vx = vx;
    live.vy = vy;
    live.grow = Math.min(1, live.grow + dt / STIR_STEP);
    live.done = live.grow >= 1;
  } else if (head) {
    head.done = true;
  }

  while (trail.length && trail[trail.length - 1].age > STIR_LIFE) trail.pop();
  for (let i = 0; i < MAX_STIRS; i++) {
    const sample = trail[i];
    if (!sample) { stirWeights[i] = 0; continue; }
    const fade = 1 - sample.age / STIR_LIFE;
    const cap = Math.min(1, 2.2 / Math.max(Math.hypot(sample.vx, sample.vy), 0.001));
    stirs.set([sample.x, sample.y, sample.vx * cap, sample.vy * cap], i * 4);
    stirWeights[i] = fade * fade * sample.grow * stirStrength * 0.05;
  }

  spins.forEach((spin) => { spin.age += dt; });
  while (spins.length && spins[spins.length - 1].age > TWIRL_LIFE) spins.pop();
  for (let i = 0; i < MAX_TWIRLS; i++) {
    const spin = spins[i];
    if (!spin) { twirls[i * 4 + 2] = 0; continue; }
    const k = spin.age / TWIRL_LIFE;
    const envelope = Math.min(1, spin.age / 0.18) * (1 - k) * (1 - k);
    twirls.set([spin.x, spin.y, spin.direction * 2.4 * envelope, 0.16 + 0.1 * Math.min(1, spin.age / 0.5)], i * 4);
  }
}
