import {
  DEFAULT_PARAMS, empiricalStats, makeHistogram, simulate, theoreticalStats,
  type LabKind, type LabParams, type Trial
} from "./simulations";

export const VIDEO_WIDTH = 720;
export const VIDEO_HEIGHT = 1280;
export const VIDEO_FPS = 24;
export const VIDEO_DURATIONS = [15, 30] as const;
export const LAB_ORDER: LabKind[] = ["coin", "normal", "arrivals", "wait", "tails"];
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];
export type StoryPhase = "hook" | "phenomenon" | "distribution" | "discovery";

export type ShortScript = {
  title: string;
  subtitle: string;
  hook: string;
  question: string;
  action: string;
  insight: string;
  caution: string;
  symbol: string;
  color: string;
  unit: string;
  chartTitle: string;
};
export const SHORT_SCRIPTS: Record<LabKind, ShortScript> = {
  coin: {
    title: "コイン10回で、表は必ず5回？",
    subtitle: "「平均」と「毎回」は、違う。",
    hook: "10回投げたら、表は必ず5回？",
    question: "同じ条件でも結果は変わる",
    action: "10回投げる実験を何百セットも繰り返す",
    insight: "回数のばらつきに、二項分布が現れる。",
    caution: "公平なコイン、独立な試行のモデル",
    symbol: "◒", color: "#ffcd6e", unit: "回", chartTitle: "表が出た回数"
  },
  normal: {
    title: "なぜ、釣鐘型になるの？",
    subtitle: "小さな誤差を、たくさん足す。",
    hook: "ランダムなズレを足すと、何が起きる？",
    question: "小さな誤差が毎回ちがう",
    action: "独立な誤差を足して、実験を繰り返す",
    insight: "標準化した和は、正規分布に近づく。",
    caution: "中心極限定理による近似・独立な誤差のモデル",
    symbol: "∿", color: "#64e0d0", unit: "", chartTitle: "誤差の合計（標準化）"
  },
  arrivals: {
    title: "平均5人の店、今日は何人？",
    subtitle: "同じ営業時間でも、来客数は違う。",
    hook: "1時間に平均5人なら、毎回5人？",
    question: "お客さんが来る時刻はバラバラ",
    action: "何百日の営業を、何度も再現する",
    insight: "来客数には、ポアソン分布が現れる。",
    caution: "一定の到着率を仮定したポアソン過程",
    symbol: "●", color: "#ffb56c", unit: "人", chartTitle: "営業ごとの来客数"
  },
  wait: {
    title: "平均12分待ち。次は12分後？",
    subtitle: "短い待ち時間も、長い待ち時間も。",
    hook: "平均12分なら、毎回12分待つ？",
    question: "次の人が来る時刻は決まっていない",
    action: "次の来客までの時間を何百回も観測",
    insight: "待ち時間には、指数分布が現れる。",
    caution: "一定の到着率を仮定したポアソン過程",
    symbol: "◷", color: "#d6a7ff", unit: "分", chartTitle: "次の来客までの待ち時間"
  },
  tails: {
    title: "平均が同じでも、リスクは違う？",
    subtitle: "極端な損失が、結果を変える。",
    hook: "平均100万円なら、危険度も同じ？",
    question: "まれに、とても大きな損失が起こる",
    action: "損失額を何百回もシミュレーション",
    insight: "平均だけでは、裾の重さはわからない。",
    caution: "仮想の損失分布モデル・現実の予測ではありません",
    symbol: "↗", color: "#ff9fac", unit: "万円", chartTitle: "1件あたりの損失額"
  }
};

export function phaseAt(progress: number): StoryPhase {
  const p = Math.max(0, Math.min(1, progress));
  if (p < 0.17) return "hook";
  if (p < 0.48) return "phenomenon";
  if (p < 0.84) return "distribution";
  return "discovery";
}
export function visibleSampleCount(progress: number, total: number): number {
  if (total <= 0) return 0;
  const p = Math.max(0, Math.min(1, progress));
  if (p < 0.17) return 0;
  if (p < 0.48) return Math.max(1, Math.min(total, Math.ceil((p - 0.17) / 0.31 * 10)));
  return Math.max(1, Math.min(total, Math.ceil((p - 0.48) / 0.36 * total)));
}
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type VideoStory = {
  kind: LabKind; params: LabParams; seed: number;
  samples: Trial[];
  examples: Trial[];
  script: ShortScript;
  theoretical: { mean: number; variance: number; unit: string };
};
export function createVideoStory(kind: LabKind, params: LabParams = DEFAULT_PARAMS, seed = 20261025): VideoStory {
  const rng = seededRandom(seed);
  const sampleCount = 600;
  const source = Array.from({ length: sampleCount }, () => simulate(kind, params, rng));
  return {
    kind, params: { ...params }, seed, samples: source.map(item => ({ value: item.value, details: [] })),
    examples: source.slice(0, 10), script: {
      ...SHORT_SCRIPTS[kind],
      title: kind === "coin" ? `コイン${params.flips}回で、表は何回？`
        : kind === "arrivals" ? `平均${params.rate}人の店、今日は何人？`
        : kind === "wait" ? `平均${(60 / params.rate).toFixed(0)}分待ち。毎回同じ？`
        : SHORT_SCRIPTS[kind].title
    }, theoretical: theoreticalStats(kind, params)
  };
}
export function createVideoScript(story: VideoStory, duration: VideoDuration): string {
  const { script, kind, params, theoretical } = story;
  const endHook = Math.round(duration * 0.17);
  const endPhenomenon = Math.round(duration * 0.48);
  const endDistribution = Math.round(duration * 0.84);
  const specifics = kind === "coin" ? `1セット ${params.flips} 回／表の確率 ${params.probability}`
    : kind === "normal" ? `独立な誤差 ${params.steps} 個`
    : kind === "arrivals" ? `来客率 ${params.rate} 人/時間／営業時間 ${params.minutes} 分`
    : kind === "wait" ? `来客率 ${params.rate} 人/時間`
    : `${params.tailModel === "pareto" ? "パレート" : "対数正規"}分布／平均100万円`;
  return [
    `# ${script.title}（${duration}秒／縦型9:16）`,
    "",
    `0–${endHook}秒｜問い：${script.hook}`,
    `${endHook}–${endPhenomenon}秒｜現象：${script.question}。${script.action}。`,
    `${endPhenomenon}–${endDistribution}秒｜分布：実際の結果と理論確率を重ねて比較します。`,
    `${endDistribution}–${duration}秒｜発見：${script.insight}`,
    "",
    `実験条件：${specifics}`,
    `理論平均：${Number.isFinite(theoretical.mean) ? theoretical.mean.toFixed(2) : "∞"} ${theoretical.unit}`,
    `注意：${script.caution}`,
    "※ 画面の実測データは乱数シミュレーション。理論値はモデルから計算した値です。",
    "リンク：https://shunshun0904.github.io/probability-world/"
  ].join("\n");
}

const C = {
  navy: "#111f3d", text: "#14254a", muted: "#7487a7", white: "#fff",
  lavender: "#eff2fd", grid: "#e2e9f5", blue: "#5c72e6", orange: "#ea9b58"
};
function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill; ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
}
function print(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, weight = 700, align: CanvasTextAlign = "left") {
  ctx.save();ctx.font = `${weight} ${size}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`;
  ctx.textAlign=align;ctx.textBaseline="middle";ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
}
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, maxLines = 3): string[] {
  ctx.save();ctx.font=`800 ${size}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`;
  const words=Array.from(text);
  const lines: string[]=[];let line="";
  for (const ch of words) {
    if (ctx.measureText(line+ch).width>maxWidth && line) {
      lines.push(line);line=ch;
      if (lines.length>=maxLines) break;
    } else line+=ch;
  }
  if (line && lines.length<maxLines) lines.push(line);
  ctx.restore();
  return lines;
}
function centerLines(ctx: CanvasRenderingContext2D, text: string, y: number, width: number, size = 42, color = C.text, maxLines = 3) {
  const lines=wrapText(ctx,text,width,size,maxLines);
  const start=y-(lines.length-1)*size*0.7;
  lines.forEach((line,i)=>print(ctx,line,360,start+i*size*1.4,size,color,850,"center"));
}
function mainCard(ctx: CanvasRenderingContext2D, y: number, height: number) {
  rounded(ctx,40,y,640,height,28,C.white);
}
function divider(ctx: CanvasRenderingContext2D,y: number) {
  ctx.fillStyle=C.grid;ctx.fillRect(78,y,564,2);
}
function label(ctx:CanvasRenderingContext2D,txt:string,y:number,accent:string) {
  rounded(ctx,75,y-17,Math.min(550,txt.length*17+38),35,17,accent);
  print(ctx,txt,93,y,18,C.navy,900);
}
function ruler(ctx:CanvasRenderingContext2D,x:number,y:number,w:number){
  ctx.strokeStyle="#b6c4dd";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();
  for(let i=0;i<=5;i++){const px=x+i*w/5;ctx.fillStyle="#8495b2";ctx.fillRect(px-1,y-7,2,14);}
}
function paintPhenomenon(ctx:CanvasRenderingContext2D,story:VideoStory,progress:number) {
  const {kind,script,examples,params}=story;
  mainCard(ctx,345,655);
  label(ctx,"02 / 現象を何度も再現",390,script.color);
  centerLines(ctx,script.question,455,555,35);
  const revealed = Math.max(1, Math.min(6,Math.floor((progress-0.17)/0.31*6)+1));
  if(kind==="coin"){
    for(let row=0;row<5;row++){
      const values=examples[row].details;
      const y=565+row*73;
      print(ctx,`#${row+1}`,90,y+18,21,C.muted,700);
      for(let i=0;i<Math.min(10,values.length);i++){
        const cx=145+i*45;rounded(ctx,cx-15,y,34,34,17,values[i]?"#ffd26b":"#cbd5ed");
        print(ctx,values[i]?"表":"裏",cx+2,y+17,17,C.text,900,"center");
      }
      print(ctx,row<revealed?`${examples[row].value}回`:"…",610,y+17,22,C.text,900,"right");
    }
  } else if(kind==="arrivals"){
    const count=Math.min(revealed,6);
    for(let i=0;i<count;i++){
      const e=examples[i];const y=585+i*57;
      print(ctx,`${i+1}日目`,88,y,21,C.text,750);
      ruler(ctx,200,y,350);
      for(const minute of e.details.slice(0,50)){
        const x=200+Math.min(minute/params.minutes,1)*350;
        rounded(ctx,x-5,y-11,10,22,5,"#f49b51");
      }
      print(ctx,`${e.value}人`,615,y,22,C.text,900,"right");
    }
  } else if(kind==="normal"){
    for(let i=0;i<Math.min(revealed,6);i++){
      const v=examples[i].value;
      const y=575+i*57;
      ruler(ctx,140,y,430);
      rounded(ctx,350+Math.max(-180,Math.min(180,v*50))-6,y-12,12,24,6,"#4cc0ad");
      print(ctx,`${v>=0?"+":""}${v.toFixed(2)}`,610,y,23,C.text,800,"right");
    }
  } else if(kind==="wait"){
    for(let i=0;i<Math.min(revealed,6);i++){
      const v=examples[i].value,y=570+i*58;
      print(ctx,`${i+1}回目`,92,y,22,C.muted,800);
      rounded(ctx,205,y-13,Math.min(300,v/(60/params.rate)*110),26,13,"#c9a9ef");
      print(ctx,`${v.toFixed(1)}分`,608,y,23,C.text,850,"right");
    }
  } else {
    for(let i=0;i<Math.min(revealed,6);i++){
      const v=examples[i].value,y=570+i*58;
      print(ctx,`${i+1}件目`,94,y,22,C.muted,800);
      rounded(ctx,200,y-13,Math.min(320,v/300*240),26,13,v>=300?"#ef929a":"#a4b6f3");
      print(ctx,`${v.toFixed(1)}万円`,626,y,22,C.text,800,"right");
    }
  }
  divider(ctx,933);
  centerLines(ctx,script.action,967,540,25,C.blue,2);
}
function paintHistogram(ctx:CanvasRenderingContext2D,story:VideoStory,progress:number) {
  const {script,kind,params,samples}=story;
  const count=visibleSampleCount(progress,samples.length);
  const subset=samples.slice(0,count);
  const bins=makeHistogram(kind,params,subset);
  mainCard(ctx,345,670);
  label(ctx,"03 / 分布が見えてくる",392,script.color);
  centerLines(ctx,script.chartTitle,459,540,34,C.text);
  const bx=92,by=540,bw=548,bh=316;
  const top=Math.max(0.06,...bins.map(item=>Math.max(item.theoretical,item.observed)))*1.18;
  for(let i=0;i<=4;i++){
    const y=by+bh-i*bh/4;
    ctx.strokeStyle="#e2e9f5";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bx,y);ctx.lineTo(bx+bw,y);ctx.stroke();
    print(ctx,(top*i/4*100).toFixed(0)+"%",bx-12,y,16,C.muted,650,"right");
  }
  const ww=bw/bins.length;
  const pts: Array<[number,number]>=[];
  bins.forEach((bin,index)=>{
    const x=bx+ww*(index+0.5);
    const barH=bin.observed/top*bh;
    rounded(ctx,bx+index*ww+1,by+bh-barH,Math.max(2,ww-2),Math.max(0,barH),3,C.blue);
    pts.push([x,by+bh-bin.theoretical/top*bh]);
  });
  ctx.strokeStyle=C.orange;ctx.lineWidth=5;ctx.lineJoin="round";ctx.beginPath();
  pts.forEach(([x,y],index)=>index?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
  const positions=[0,Math.floor((bins.length-1)/2),bins.length-1];
  positions.forEach(idx=>print(ctx,bins[idx].label,bx+ww*(idx+0.5),by+bh+28,17,C.muted,750,"center"));
  rounded(ctx,95,900,18,12,3,C.blue);print(ctx,"実測",123,907,20,C.muted,800);
  rounded(ctx,305,900,18,12,3,C.orange);print(ctx,"理論モデル",334,907,20,C.muted,800);
  print(ctx,`${count.toLocaleString("ja-JP")} セットの観測`,612,973,25,C.blue,900,"right");
}
function paintHook(ctx:CanvasRenderingContext2D,story:VideoStory,progress:number) {
  const {script}=story;mainCard(ctx,345,645);
  print(ctx,"01 / QUESTION",360,408,22,C.blue,900,"center");
  const pulse=Math.sin(progress*65)*7;
  print(ctx,script.symbol,360,605+pulse,192,C.blue,600,"center");
  centerLines(ctx,script.hook,775,520,43,C.text,3);
  rounded(ctx,150,875,420,56,28,C.lavender);
  print(ctx,"予想してみよう",360,903,23,C.blue,850,"center");
}
function paintDiscovery(ctx:CanvasRenderingContext2D,story:VideoStory) {
  const {script,kind,params,samples,theoretical}=story;
  mainCard(ctx,345,660);
  print(ctx,"04 / DISCOVERY",360,402,22,C.blue,900,"center");
  print(ctx,script.symbol,360,552,115,script.color,700,"center");
  centerLines(ctx,script.insight,685,520,43,C.text,3);
  divider(ctx,785);
  const sampleStats=empiricalStats(samples);
  print(ctx,"実測平均",105,837,22,C.muted,800);print(ctx,sampleStats.mean.toFixed(2),610,837,33,C.blue,900,"right");
  print(ctx,"理論平均",105,896,22,C.muted,800);print(ctx,theoretical.mean.toFixed(2),610,896,33,C.text,900,"right");
  if(kind==="tails")print(ctx,`300万円以上の理論確率: ${(100*tailSurvival(300,params)).toFixed(1)}%`,360,968,17,C.muted,800,"center");
}
export function drawShortFrame(ctx: CanvasRenderingContext2D, story: VideoStory, seconds: number, duration: VideoDuration) {
  const progress=Math.max(0,Math.min(1,seconds/duration));
  const {script}=story;
  ctx.clearRect(0,0,VIDEO_WIDTH,VIDEO_HEIGHT);
  const bg=ctx.createLinearGradient(0,0,720,1280);bg.addColorStop(0,"#13264b");bg.addColorStop(1,"#0c1730");
  ctx.fillStyle=bg;ctx.fillRect(0,0,720,1280);
  for(let i=0;i<35;i++){
    const x=(i*143+79)%720,y=(i*241+101)%1200;
    ctx.fillStyle="#bbd5ff";ctx.globalAlpha=0.1+(i%5)*0.05;
    ctx.beginPath();ctx.arc(x,y,(i%3)+1.5,0,Math.PI*2);ctx.fill();
  } ctx.globalAlpha=1;
  print(ctx,"◈  確率の世界",46,76,25,C.white,900);
  print(ctx,"PROBABILITY WORLD / SHORTS",45,114,15,"#a2b6d9",800);
  rounded(ctx,45,158,16,30,8,script.color);
  print(ctx,"現象から学ぶ確率分布",76,174,22,script.color,800);
  centerLines(ctx,script.title,252,640,45,C.white,3);
  rounded(ctx,40,1070,640,140,23,"#28416e");
  centerLines(ctx,phaseAt(progress)==="hook"?"まずは、予想してみよう":phaseAt(progress)==="phenomenon"?"同じ条件で、何度も繰り返す":phaseAt(progress)==="distribution"?"青が実測、オレンジが理論":"『確率の世界』で、自分でも実験！",1115,565,24,C.white,2);
  print(ctx,script.caution,360,1185,14,"#b2c2dd",600,"center");
  const phase=phaseAt(progress);
  if(phase==="hook")paintHook(ctx,story,progress);
  else if(phase==="phenomenon")paintPhenomenon(ctx,story,progress);
  else if(phase==="distribution")paintHistogram(ctx,story,progress);
  else paintDiscovery(ctx,story);
  rounded(ctx,40,1234,640,6,3,"#33476d");
  rounded(ctx,40,1234,640*progress,6,3,script.color);
}
