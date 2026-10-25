export type LabKind = "coin" | "normal" | "arrivals" | "wait" | "tails";
export type TailModel = "lognormal" | "pareto";
export type LabParams = {
  flips: number; probability: number; steps: number; rate: number;
  minutes: number; tailModel: TailModel; sigma: number; alpha: number;
};
export type Trial = { value: number; details: number[] };
export type Bin = { label: string; observed: number; theoretical: number; start: number; end: number };
export const DEFAULT_PARAMS: LabParams = {
  flips: 10, probability: 0.5, steps: 12, rate: 5, minutes: 90,
  tailModel: "lognormal", sigma: 1.25, alpha: 1.8
};
export const MAX_TRIALS = 20000;
const EPS = 1e-12;
const unit = (rng: () => number) => Math.min(1 - EPS, Math.max(EPS, rng()));
const integer = (n: number) => Math.floor(n);
export function binomialPmf(n: number, p: number): number[] {
  const probabilities = Array(n + 1).fill(0) as number[];
  for (let k = 0; k <= n; k++) {
    let combination = 1;
    for (let i = 1; i <= k; i++) combination = combination * (n - i + 1) / i;
    probabilities[k] = combination * p ** k * (1 - p) ** (n - k);
  }
  return probabilities;
}
export function poissonPmf(k: number, mean: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  let value = Math.exp(-mean);
  for (let i = 1; i <= k; i++) value *= mean / i;
  return value;
}
export function normalPdf(x: number): number {
  return Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);
}
export function gaussian(rng: () => number = Math.random): number {
  return Math.sqrt(-2 * Math.log(unit(rng))) * Math.cos(2 * Math.PI * unit(rng));
}
export function tailMinimum(model: TailModel, alpha: number): number {
  return model === "pareto" ? 100 * (alpha - 1) / alpha : 0;
}
export function tailSurvival(x: number, params: LabParams): number {
  if (x <= 0) return 1;
  if (params.tailModel === "pareto") {
    const min = tailMinimum("pareto", params.alpha);
    return x < min ? 1 : (min / x) ** params.alpha;
  }
  const z = (Math.log(x / 100) + params.sigma * params.sigma / 2) / params.sigma;
  // Abramowitz–Stegun normal CDF approximation, worst-case error ~ 7.5e-8.
  const az = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * az);
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const tail = normalPdf(az) * poly;
  return Math.max(0, Math.min(1, z >= 0 ? tail : 1 - tail));
}
export function simulate(kind: LabKind, params: LabParams, rng: () => number = Math.random): Trial {
  switch (kind) {
    case "coin": {
      const details = Array.from({ length: params.flips }, () => unit(rng) < params.probability ? 1 : 0);
      return { value: details.reduce((total, x) => total + x, 0), details };
    }
    case "normal": {
      // Independent small errors; standardization gives variance 1 for any step count.
      const details = Array.from({ length: params.steps }, () => unit(rng) - 0.5);
      const total = details.reduce((sum, x) => sum + x, 0);
      return { value: total / Math.sqrt(params.steps / 12), details };
    }
    case "arrivals": {
      const details: number[] = [];
      let minute = 0;
      while (true) {
        minute += -Math.log(unit(rng)) * 60 / params.rate;
        if (minute > params.minutes) break;
        details.push(minute);
        if (details.length > 2000) break; // avoid an unbounded loop for a pathological RNG
      }
      return { value: details.length, details };
    }
    case "wait": {
      const waitingMinutes = -Math.log(unit(rng)) * 60 / params.rate;
      return { value: waitingMinutes, details: [waitingMinutes] };
    }
    case "tails": {
      if (params.tailModel === "pareto") {
        const minimum = tailMinimum("pareto", params.alpha);
        return { value: minimum / unit(rng) ** (1 / params.alpha), details: [] };
      }
      const logMean = Math.log(100) - params.sigma * params.sigma / 2;
      return { value: Math.exp(logMean + params.sigma * gaussian(rng)), details: [] };
    }
  }
}
export function theoreticalStats(kind: LabKind, p: LabParams): { mean: number; variance: number; unit: string } {
  switch (kind) {
    case "coin": return { mean: p.flips * p.probability, variance: p.flips * p.probability * (1 - p.probability), unit: "回" };
    case "normal": return { mean: 0, variance: 1, unit: "" };
    case "arrivals": {
      const mean = p.rate * p.minutes / 60;
      return { mean, variance: mean, unit: "人" };
    }
    case "wait": {
      const mean = 60 / p.rate;
      return { mean, variance: mean * mean, unit: "分" };
    }
    case "tails": return { mean: 100, variance: p.tailModel === "pareto" ? (p.alpha <= 2 ? Infinity : 10000 / (p.alpha * (p.alpha - 2))) : 10000 * (Math.exp(p.sigma * p.sigma) - 1), unit: "万円" };
  }
}
export function empiricalStats(trials: Trial[]): { mean: number; variance: number } {
  if (!trials.length) return { mean: 0, variance: 0 };
  const mean = trials.reduce((sum, trial) => sum + trial.value, 0) / trials.length;
  const variance = trials.reduce((sum, trial) => sum + (trial.value - mean) ** 2, 0) / trials.length;
  return { mean, variance };
}
export function makeHistogram(kind: LabKind, params: LabParams, trials: Trial[]): Bin[] {
  const mean = params.rate * params.minutes / 60;
  if (kind === "coin" || kind === "arrivals") {
    const max = kind === "coin" ? params.flips : Math.max(12, Math.ceil(mean + 4 * Math.sqrt(mean)));
    const probs = kind === "coin" ? binomialPmf(params.flips, params.probability) : Array.from({ length: max + 1 }, (_, k) => poissonPmf(k, mean));
    const bins = Array.from({ length: max + 1 }, (_, i) => ({
      label: i === max && kind === "arrivals" ? String(i) + "+" : String(i),
      start: i, end: i + 1,
      theoretical: i === max && kind === "arrivals" ? Math.max(0, 1 - probs.slice(0, i).reduce((a, b) => a + b, 0)) : probs[i],
      observed: 0
    }));
    for (const trial of trials) bins[Math.min(max, integer(trial.value))].observed++;
    return bins.map(bin => ({ ...bin, observed: trials.length ? bin.observed / trials.length : 0 }));
  }
  const max = kind === "normal" ? 4 : kind === "wait" ? 5 * 60 / params.rate : 600;
  const min = kind === "normal" ? -4 : 0;
  const steps = kind === "normal" ? 24 : 22;
  const step = (max - min) / steps;
  const bins: Bin[] = Array.from({ length: steps }, (_, i) => {
    const start = min + i * step;
    const end = start + step;
    let theoretical = 0;
    if (kind === "wait") {
      theoretical = Math.exp(-params.rate * start / 60) - (i === steps - 1 ? 0 : Math.exp(-params.rate * end / 60));
    } else if (kind === "tails") {
      theoretical = tailSurvival(start, params) - (i === steps - 1 ? 0 : tailSurvival(end, params));
    } else {
      // For the CLT lab this is an asymptotic normal approximation, not the exact finite-sample law.
      theoretical = normalPdf((start + end) / 2) * step;
    }
    return {
      label: i === steps - 1 ? "≥" + Math.round(start) : Number(start.toFixed(1)).toString(),
      start, end, theoretical: Math.max(0, theoretical), observed: 0
    };
  });
  for (const trial of trials) {
    const i = Math.max(0, Math.min(steps - 1, integer((trial.value - min) / step)));
    bins[i].observed++;
  }
  return bins.map(bin => ({ ...bin, observed: trials.length ? bin.observed / trials.length : 0 }));
}
