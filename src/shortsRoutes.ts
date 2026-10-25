import { DEFAULT_PARAMS, type LabKind, type LabParams } from "./simulations";
import { LAB_ORDER } from "./shortsEngine";

const bounds: Record<Exclude<keyof LabParams, "tailModel">, [number,number]> = {
  flips: [2,30], probability: [0.05,0.95], steps: [1,30],
  rate: [1,20], minutes: [15,180], sigma: [0.3,1.8], alpha: [1.2,4]
};
const intKeys = new Set(["flips","steps","minutes"]);
function safeNumber(value: string | null, key: Exclude<keyof LabParams, "tailModel">): number {
  const n = value === null || value.trim() === "" ? NaN : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PARAMS[key];
  const [min,max]=bounds[key];
  const clipped=Math.min(max,Math.max(min,n));
  return intKeys.has(key) ? Math.round(clipped) : clipped;
}
export function parseStudioQuery(search: string): { kind: LabKind; params: LabParams } {
  const query=new URLSearchParams(search);
  const raw=query.get("studio");
  const kind:LabKind=LAB_ORDER.includes(raw as LabKind) ? raw as LabKind : "arrivals";
  const params:LabParams={...DEFAULT_PARAMS};
  for(const key of Object.keys(bounds) as Array<Exclude<keyof LabParams, "tailModel">>) {
    params[key]=safeNumber(query.get(key),key);
  }
  params.tailModel=query.get("tailModel")==="pareto"?"pareto":"lognormal";
  return { kind,params };
}
export function parseStudioSeed(search: string): number {
  const raw = new URLSearchParams(search).get("seed");
  if (raw === null || !/^\\d+$/.test(raw)) return 20261025;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 0xFFFFFFFF ? parsed : 20261025;
}
export function studioUrl(kind: LabKind, params: LabParams, seed = 20261025): string {
  const query=new URLSearchParams({studio:kind,seed:String(seed >>> 0)});
  const fields: Array<keyof LabParams> = kind==="coin" ? ["flips","probability"] :
    kind==="normal"?["steps"]:kind==="arrivals"?["rate","minutes"]:
    kind==="wait"?["rate"]:["tailModel","sigma","alpha"];
  for(const field of fields) query.set(field,String(params[field]));
  return "?"+query.toString();
}
