/** Unit-mass damped harmonic response, including critical and overdamped springs. */
export function springPosition(
  t: number,
  stiffness: number,
  dampingRatio: number,
): number {
  const omega = Math.sqrt(stiffness);
  if (Math.abs(dampingRatio - 1) < 0.0001)
    return 1 - (1 + omega * t) * Math.exp(-omega * t);
  if (dampingRatio < 1) {
    const q = Math.sqrt(1 - dampingRatio ** 2);
    return (
      1 -
      Math.exp(-dampingRatio * omega * t) *
        (Math.cos(omega * q * t) + (dampingRatio / q) * Math.sin(omega * q * t))
    );
  }
  const q = Math.sqrt(dampingRatio ** 2 - 1);
  const a = -omega * (dampingRatio - q);
  const b = -omega * (dampingRatio + q);
  return 1 + (b * Math.exp(a * t) - a * Math.exp(b * t)) / (a - b);
}
export function springSamples(stiffness: number, dampingRatio: number) {
  let duration = 2.4;
  // Require 150 ms of near-rest before ending rather than stopping at an overshoot crossing.
  for (let t = 0.2; t < 2.4; t += 0.02) {
    if (
      Array.from({ length: 8 }, (_, i) =>
        Math.abs(1 - springPosition(t + i * 0.02, stiffness, dampingRatio)),
      ).every((error) => error < 0.001)
    ) {
      duration = t + 0.14;
      break;
    }
  }
  const values = Array.from({ length: 61 }, (_, i) =>
    springPosition((duration * i) / 60, stiffness, dampingRatio),
  );
  values[0] = 0;
  values[60] = 1;
  return { values, duration: Math.round(duration * 1000) };
}
export const springPresets = {
  calm: {
    stiffness: 380,
    damping: 0.8,
    description: "A gentle arrival. A quiet confidence.",
  },
  playful: {
    stiffness: 220,
    damping: 0.45,
    description: "A little overshoot. A little personality.",
  },
  snappy: {
    stiffness: 900,
    damping: 0.9,
    description: "Quick, decisive and right where it belongs.",
  },
} as const;
