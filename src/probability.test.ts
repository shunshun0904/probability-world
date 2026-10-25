import { describe, expect, it } from "vitest";
import { deviation, frequencies, rollDie, summarize, THEORETICAL } from "./probability";
describe("dice probability helpers", () => {
  it("generates valid die faces", () => { for (let i = 0; i < 2000; i++) expect(rollDie()).toBeGreaterThanOrEqual(1), expect(rollDie()).toBeLessThanOrEqual(6); });
  it("counts the six faces", () => { expect(summarize([1, 2, 1, 6])).toEqual([2, 1, 0, 0, 0, 1]); });
  it("uses zero frequencies when there are no rolls", () => { expect(frequencies([0,0,0,0,0,0])).toEqual([0,0,0,0,0,0]); });
  it("approaches theoretical probability for balanced counts", () => { expect(deviation([5,5,5,5,5,5])).toBeCloseTo(0); expect(THEORETICAL).toBeCloseTo(1 / 6); });
  it("rejects invalid faces", () => { expect(() => summarize([0])).toThrow(RangeError); });
});
