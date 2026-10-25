import { describe, expect, it } from "vitest";
import { binomialPmf, DEFAULT_PARAMS, empiricalStats, makeHistogram, poissonPmf, simulate, tailSurvival, theoreticalStats } from "./simulations";

describe("phenomenon-based probability models", () => {
  it("binomial PMF sums to one and has the right expectation", () => {
    const probabilities = binomialPmf(10, 0.3);
    expect(probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(probabilities.reduce((sum, value, k) => sum + k * value, 0)).toBeCloseTo(3, 9);
  });
  it("a fair coin is not predetermined", () => {
    expect(simulate("coin", { ...DEFAULT_PARAMS, flips: 4 }, () => 0.2).value).toBe(4);
    expect(simulate("coin", { ...DEFAULT_PARAMS, flips: 4 }, () => 0.8).value).toBe(0);
  });
  it("Poisson has the correct mean and probability mass", () => {
    const expectedMean = 5 * 90 / 60;
    const stats = theoreticalStats("arrivals", DEFAULT_PARAMS);
    expect(stats.mean).toBe(7.5);
    expect(stats.variance).toBe(7.5);
    const mass = Array.from({ length: 80 }, (_, k) => poissonPmf(k, expectedMean)).reduce((a, b) => a + b, 0);
    expect(mass).toBeCloseTo(1, 9);
  });
  it("exponential waiting time scales with rate", () => {
    const low = simulate("wait", { ...DEFAULT_PARAMS, rate: 5 }, () => 0.5).value;
    const high = simulate("wait", { ...DEFAULT_PARAMS, rate: 10 }, () => 0.5).value;
    expect(low / high).toBeCloseTo(2, 10);
  });
  it("arrival events fit inside the observation period", () => {
    const result = simulate("arrivals", DEFAULT_PARAMS, () => 0.5);
    expect(result.value).toBe(result.details.length);
    expect(result.details.every(t => t >= 0 && t <= DEFAULT_PARAMS.minutes)).toBe(true);
  });
  it("normalizing independent small errors has mean approximately zero", () => {
    const model = theoreticalStats("normal", DEFAULT_PARAMS);
    expect(model.mean).toBe(0);
    expect(model.variance).toBe(1);
  });
  it("Pareto and lognormal tail survival is monotone", () => {
    for (const tailModel of ["pareto", "lognormal"] as const) {
      const params = { ...DEFAULT_PARAMS, tailModel };
      expect(tailSurvival(50, params)).toBeGreaterThanOrEqual(tailSurvival(300, params));
      expect(tailSurvival(300, params)).toBeGreaterThanOrEqual(0);
    }
    expect(theoreticalStats("tails", { ...DEFAULT_PARAMS, alpha: 1.8, tailModel: "pareto" }).variance).toBe(Infinity);
  });
  it("histograms group every observation, including overflow", () => {
    const trials = [{ value: 2, details: [] }, { value: 10000, details: [] }];
    const bins = makeHistogram("arrivals", DEFAULT_PARAMS, trials);
    expect(bins.reduce((total, bin) => total + bin.observed, 0)).toBeCloseTo(1, 10);
    expect(bins.at(-1)?.observed).toBe(0.5);
    expect(bins.reduce((total, bin) => total + bin.theoretical, 0)).toBeCloseTo(1, 6);
  });
  it("empirical sample uses population variance", () => {
    expect(empiricalStats([{ value: 1, details: [] }, { value: 3, details: [] }])).toEqual({ mean: 2, variance: 1 });
  });
});
