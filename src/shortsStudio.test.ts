import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "./simulations";
import {
  createVideoScript, createVideoStory, phaseAt, seededRandom,
  VIDEO_HEIGHT, VIDEO_WIDTH, visibleSampleCount, wrapText
} from "./shortsEngine";
import { parseStudioQuery, studioUrl } from "./shortsRoutes";
import { pickVideoFormat } from "./shortsRecorder";

describe("Shorts studio storyboard engine", () => {
  it("renders the vertical 9:16 geometry", () => {
    expect(VIDEO_WIDTH / VIDEO_HEIGHT).toBeCloseTo(9 / 16, 8);
  });
  it("progress moves through four storytelling stages", () => {
    expect(phaseAt(0)).toBe("hook");
    expect(phaseAt(0.2)).toBe("phenomenon");
    expect(phaseAt(0.5)).toBe("distribution");
    expect(phaseAt(0.9)).toBe("discovery");
    expect(phaseAt(3)).toBe("discovery");
    expect(visibleSampleCount(0.1, 600)).toBe(0);
    expect(visibleSampleCount(0.84, 600)).toBe(600);
    expect(visibleSampleCount(-3, 600)).toBe(0);
  });
  it("gives repeatable samples and consistent headlines with the chosen model", () => {
    const params = { ...DEFAULT_PARAMS, flips: 16, probability: 0.3 };
    const a = createVideoStory("coin", params, 42);
    const b = createVideoStory("coin", params, 42);
    const c = createVideoStory("coin", params, 43);
    expect(a.samples).toEqual(b.samples);
    expect(a.samples).not.toEqual(c.samples);
    expect(a.script.title).toContain("16回");
    expect(a.samples).toHaveLength(600);
    expect(a.samples.every(trial => trial.value >= 0 && trial.value <= 16)).toBe(true);
    expect(a.examples[0].details).toHaveLength(16);
    expect(seededRandom(1)()).toBe(seededRandom(1)());
  });
  it("reuses the site's phenomenon simulations and theory", () => {
    const story=createVideoStory("arrivals",{ ...DEFAULT_PARAMS,rate:5,minutes:90 },99);
    expect(story.theoretical.mean).toBe(7.5);
    const script=createVideoScript(story,30);
    expect(script).toContain("ポアソン");
    expect(script).toContain("来客率 5 人/時間");
    expect(script).toContain("30秒");
    expect(script).toContain("モデル");
  });
  it("round-trips the experiment conditions and rejects dangerous URL values", () => {
    const params = { ...DEFAULT_PARAMS, rate:7,minutes:120 };
    const parsed=parseStudioQuery(studioUrl("arrivals", params));
    expect(parsed.kind).toBe("arrivals");
    expect(parsed.params.rate).toBe(7);
    expect(parsed.params.minutes).toBe(120);
    const invalid=parseStudioQuery("?studio=unknown&rate=Infinity&minutes=-10000&sigma=abc&alpha=0.2");
    expect(invalid.kind).toBe("arrivals");
    expect(invalid.params.rate).toBe(DEFAULT_PARAMS.rate);
    expect(invalid.params.minutes).toBe(15);
    expect(invalid.params.sigma).toBe(DEFAULT_PARAMS.sigma);
    expect(invalid.params.alpha).toBe(1.2);
  });
  it("picks supported formats without falsely assuming MP4 support", () => {
    expect(pickVideoFormat(mime=>mime.includes("webm"))?.extension).toBe("webm");
    expect(pickVideoFormat(mime=>mime.startsWith("video/mp4"))?.extension).toBe("mp4");
    expect(pickVideoFormat(()=>false)).toBe(null);
  });
  it("wraps text without exceeding the line limit", () => {
    const ctx={
      save(){},restore(){},
      measureText(value:string){return {width:value.length*20}},
      set font(_value:string){}
    };
    const result=wrapText(ctx as unknown as CanvasRenderingContext2D,"確率の世界で実験をしてみよう",100,26,3);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result[0]).toBeTruthy();
  });
});
