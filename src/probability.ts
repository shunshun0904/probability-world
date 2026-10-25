export const SIDES = 6;
export const THEORETICAL = 1 / SIDES;
export function rollDie(): number { return Math.floor(Math.random() * SIDES) + 1; }
export function summarize(rolls: number[]): number[] {
  const counts = Array(SIDES).fill(0) as number[];
  for (const value of rolls) {
    if (!Number.isInteger(value) || value < 1 || value > SIDES) throw new RangeError("Die rolls must be integers from 1 to 6");
    counts[value - 1]++;
  }
  return counts;
}
export function frequencies(counts: number[]): number[] {
  const total = counts.reduce((sum, value) => sum + value, 0);
  return counts.map(count => total === 0 ? 0 : count / total);
}
export function deviation(counts: number[]): number {
  if (counts.reduce((a, b) => a + b, 0) === 0) return 0;
  return Math.max(...frequencies(counts).map(value => Math.abs(value - THEORETICAL)));
}
