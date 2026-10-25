import { drawShortFrame, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH, type VideoDuration, type VideoStory } from "./shortsEngine";

export type VideoFormat = { mimeType: string; extension: "webm" | "mp4"; label: string };
const FORMATS: VideoFormat[] = [
  { mimeType: "video/mp4;codecs=avc1.42E01E", extension: "mp4", label: "MP4" },
  { mimeType: "video/webm;codecs=vp9", extension: "webm", label: "WebM (VP9)" },
  { mimeType: "video/webm;codecs=vp8", extension: "webm", label: "WebM (VP8)" },
  { mimeType: "video/webm", extension: "webm", label: "WebM" },
  { mimeType: "video/mp4", extension: "mp4", label: "MP4" }
];
export function pickVideoFormat(supports: (mimeType: string) => boolean): VideoFormat | null {
  return FORMATS.find(format => supports(format.mimeType)) ?? null;
}
export type RecordedShort = { blob: Blob; format: VideoFormat; filename: string };
export type VideoExportTask = { promise: Promise<RecordedShort>; cancel: () => void };

export function createVideoExport(
  story: VideoStory,
  duration: VideoDuration,
  onProgress: (progress: number) => void
): VideoExportTask {
  if (typeof window === "undefined" || !("MediaRecorder" in window)) {
    throw new Error("このブラウザは動画の録画に対応していません。ChromeまたはEdgeの最新版をお試しください。");
  }
  const format = pickVideoFormat(mime => MediaRecorder.isTypeSupported(mime));
  if (!format) {
    throw new Error("このブラウザで利用できる動画形式が見つかりませんでした。");
  }
  const canvas = document.createElement("canvas");
  canvas.width = VIDEO_WIDTH;canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx || !canvas.captureStream) throw new Error("Canvasから動画を作成できないブラウザです。");
  drawShortFrame(ctx, story, 0, duration);
  const stream = canvas.captureStream(VIDEO_FPS);
  let recorder: MediaRecorder;
  try { recorder = new MediaRecorder(stream, { mimeType: format.mimeType, videoBitsPerSecond: 3600000 }); }
  catch {
    stream.getTracks().forEach(track => track.stop());
    throw new Error("動画の録画を開始できませんでした。ブラウザの対応形式をご確認ください。");
  }
  const chunks: BlobPart[] = [];
  let raf = 0;
  let aborted = false;
  let settled = false;
  let lastProgress = 0;
  let rejectPromise: ((reason?: unknown) => void) | null = null;
  function cleanup() {
    if (raf) window.cancelAnimationFrame(raf);
    stream.getTracks().forEach(track => track.stop());
  }
  const promise = new Promise<RecordedShort>((resolve, reject) => {
    rejectPromise = reject;
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => {
      if (settled) return;
      settled = true; cleanup();
      reject(new Error("動画の録画中にエラーが発生しました。"));
    };
    recorder.onstop = () => {
      if (settled) return;
      settled = true;cleanup();
      if (aborted) { reject(new Error("動画の書き出しをキャンセルしました。")); return; }
      if (!chunks.length) { reject(new Error("動画データを生成できませんでした。")); return; }
      const blob = new Blob(chunks, { type: recorder.mimeType || format.mimeType });
      resolve({ blob, format, filename: `probability-world-${story.kind}-${duration}s-${story.seed}.${format.extension}` });
    };
    try { recorder.start(1000); }
    catch {
      settled = true;cleanup();reject(new Error("録画の開始に失敗しました。"));
      return;
    }
    const startedAt = performance.now();
    const tick = (now: number) => {
      if (settled || aborted) return;
      const elapsed = Math.min(duration, Math.max(0, (now - startedAt) / 1000));
      drawShortFrame(ctx, story, elapsed, duration);
      const progress = elapsed / duration;
      if (progress - lastProgress > 0.005 || elapsed >= duration) {
        lastProgress = progress;onProgress(progress);
      }
      if (elapsed >= duration) {
        if (recorder.state !== "inactive") recorder.stop();
      } else raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
  });
  return {
    promise,
    cancel: () => {
      if (settled || aborted) return;
      aborted = true;
      if (raf) window.cancelAnimationFrame(raf);
      if (recorder.state !== "inactive") recorder.stop();
      else {
        settled = true;cleanup();
        rejectPromise?.(new Error("動画の書き出しをキャンセルしました。"));
      }
    }
  };
}
export function triggerDownload(blob: Blob, filename: string) {
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url;anchor.download=filename;
  document.body.append(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),60000);
}
